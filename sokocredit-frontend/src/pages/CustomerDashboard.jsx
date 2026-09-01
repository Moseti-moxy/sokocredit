import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, Send, TrendingUp, Wallet, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import CustomerStripePayment from '../components/CustomerStripePayment';
import { useAuth } from '../hooks/useAuth';
import { getInterestBreakdown, money } from '../features/loans/api/loansApi';
import { applyForLoan, getRepaymentSchedule, listOwnLoans, normalizeLoan, payViaMpesa, requestRenewal } from '../features/loans/api/customerLoansApi';

const PAYABLE_STATUSES = ['Approved', 'Repaying'];

function getLoanSummary(loans) {
  const activeLoans = loans.filter((loan) => loan.status === 'Repaying');
  const outstanding = activeLoans.reduce((total, loan) => total + Number(loan.outstanding || 0), 0);
  const nextRepayment = activeLoans
    .flatMap((loan) => (loan.schedule || []).filter((item) => item.status !== 'Paid'))
    .sort((first, second) => String(first.dueDate).localeCompare(String(second.dueDate)))[0];
  return { outstanding, nextRepayment };
}

function displayDueDate(date) {
  if (!date) return 'No repayment due';
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Repayment scheduled' : `Due ${parsed.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
  const [renewalLoan, setRenewalLoan] = useState(null);
  const [renewalForm, setRenewalForm] = useState({ amount: '', duration: '3' });
  const [renewalNotice, setRenewalNotice] = useState('');
  const [error, setError] = useState('');
  const [payLoan, setPayLoan] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'M-Pesa', phoneNumber: '' });
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [interestLoan, setInterestLoan] = useState(null);
  const pendingApplication = applications.find((loan) => loan.status === 'Pending');
  const { outstanding, nextRepayment } = useMemo(() => getLoanSummary(applications), [applications]);
  const transactions = useMemo(() => applications.flatMap((loan) => (loan.schedule || []).map((payment) => ({ ...payment, loanId: loan.id, purpose: loan.purpose || 'Loan repayment', status: payment.status || 'Unpaid' }))).sort((first, second) => String(second.dueDate).localeCompare(String(first.dueDate))), [applications]);
  const estimatedLimit = useMemo(() => {
    const dailyProfit = Number(user?.dailyProfit || 0);
    return Math.min(500000, Math.max(10000, dailyProfit ? dailyProfit * 26 * 3 : 50000));
  }, [user?.dailyProfit]);
  const interestBreakdown = useMemo(() => (interestLoan ? getInterestBreakdown(interestLoan) : null), [interestLoan]);

  async function loadApplications() {
    const rawLoans = await listOwnLoans();
    return Promise.all(rawLoans.map(async (loan) => {
      const schedule = await getRepaymentSchedule(loan.id).catch(() => ({ repaymentSchedule: [], outstandingBalance: 0 }));
      return normalizeLoan(loan, schedule, rawLoans);
    }));
  }

  // Reusable after a mutation (submitRequest/submitRenewal/a Stripe payment) -
  // degrades quietly on failure, since a stale list is better than a crash.
  async function refreshApplications() {
    try {
      setApplications(await loadApplications());
    } catch { /* keep the previous list */ }
  }

  useEffect(() => {
    loadApplications().then(setApplications).catch(() => {});
  }, []);

  function updateField(field, value) { setError(''); setForm((current) => ({ ...current, [field]: value })); }
  function openRenewal(loan) { setRenewalLoan(loan); setRenewalForm({ amount: String(Math.round(Number(loan.amount || 0) * 1.25)), duration: String(loan.duration || 3) }); }
  async function submitRenewal(event) {
    event.preventDefault(); const amount = Number(renewalForm.amount); const duration = Number(renewalForm.duration);
    if (!renewalLoan || !Number.isFinite(amount) || amount < 1000 || !Number.isFinite(duration) || duration < 1 || duration > 24) { setError('Enter a valid renewal amount and term.'); return; }
    try {
      await requestRenewal(renewalLoan.id, {
        amount, duration, durationUnit: 'months', repaymentFrequency: renewalLoan.frequency,
        interestRate: renewalLoan.interestRate, purpose: renewalLoan.purpose,
      });
      await refreshApplications();
      setRenewalLoan(null);
      setRenewalNotice(`Your renewal request for KES ${money(amount)} has been sent for review.`);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit the renewal request. Please try again.');
    }
  }
  async function submitRequest(event) {
    event.preventDefault();
    const amount = Number(form.amount); const duration = Number(form.duration);
    if (!Number.isFinite(amount) || amount < 1000 || amount > estimatedLimit || !form.purpose.trim() || !Number.isFinite(duration) || duration < 1 || duration > 24) {
      setError(`Enter an amount between KES 1,000 and your estimated eligibility of KES ${money(estimatedLimit)}, your loan purpose, and a term of 1–24 months.`); return;
    }
    setRequestSubmitting(true);
    try {
      await applyForLoan({ amount, interestRate: 10, duration, durationUnit: 'months', repaymentFrequency: form.frequency, purpose: form.purpose.trim() });
      await refreshApplications();
      setIsRequestOpen(false); setForm({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit your loan request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  }

  function openPayment(loan) {
    const nextItem = (loan.schedule || []).find((item) => item.status !== 'Paid');
    const defaultAmount = nextItem ? Math.max(0, Number(nextItem.amount) - Number(nextItem.paidAmount || 0)) : loan.outstanding;
    setPayForm({ amount: defaultAmount ? String(Math.round(defaultAmount * 100) / 100) : '', method: 'M-Pesa', phoneNumber: user?.phoneNumber || '' });
    setPayError(''); setPaySuccess(''); setPayLoan(loan);
  }
  function updatePayField(field, value) { setPayError(''); setPayForm((current) => ({ ...current, [field]: value })); }
  const payAmount = Number(payForm.amount);
  const payAmountValid = payLoan && Number.isFinite(payAmount) && payAmount >= 1 && payAmount <= payLoan.outstanding;

  async function submitPayment(event) {
    event.preventDefault();
    if (!payAmountValid) {
      setPayError(`Enter an amount between KES 1 and your outstanding balance of KES ${money(payLoan.outstanding)}.`); return;
    }
    if (!payForm.phoneNumber.trim()) { setPayError('Enter the M-Pesa phone number to receive the payment prompt on.'); return; }
    setPaySubmitting(true);
    try {
      await payViaMpesa(payLoan.id, { amount: payAmount, phoneNumber: payForm.phoneNumber.trim() });
      setPaySuccess(`STK push sent to ${payForm.phoneNumber}. Enter your M-Pesa PIN on your phone to complete the KES ${money(payAmount)} payment.`);
    } catch (err) {
      setPayError(err?.response?.data?.error || 'Could not start the M-Pesa payment. Please try again.');
    } finally {
      setPaySubmitting(false);
    }
  }

  function handleStripeSuccess() {
    setPaySuccess('Card payment received. Thank you!');
    refreshApplications();
    setTimeout(() => setPayLoan(null), 1500);
  }

  return <AppShell title={`Welcome, ${user?.name?.split(' ')[0] || 'Customer'}`} subtitle="Your SokoCredit account overview">
    <div className="rounded-2xl bg-brand-700 p-6 text-white sm:p-8"><p className="text-sm text-brand-100">Customer name</p><p className="mt-1 font-display text-xl font-semibold">{user?.name || 'Customer'}</p><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-lg text-sm text-brand-100">View your active loan, repayment dates, and account activity in one simple place.</p><button type="button" onClick={() => setIsRequestOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"><Banknote size={18} /> Request a loan</button></div></div>
    {pendingApplication && <section className="mt-6 flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800"><CheckCircle2 className="mt-0.5 shrink-0 text-brand-600" size={20} /><div><p className="font-semibold">Your loan request is being reviewed</p><p className="mt-1">KES {money(pendingApplication.amount)} for {pendingApplication.purpose}. We will update you once an agent has reviewed it.</p></div></section>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Active loan" value={outstanding ? `KES ${money(outstanding)}` : 'No active loan'} deltaLabel={outstanding ? 'Current balance' : 'Apply for a loan to get started'} icon={CreditCard} /><StatCard label="Next repayment" value={nextRepayment ? `KES ${money(nextRepayment.amount)}` : 'No repayment due'} deltaLabel={displayDueDate(nextRepayment?.dueDate)} icon={CalendarDays} /><StatCard label="Account status" value="Active" deltaLabel="Your account is ready for loan requests" icon={CircleDollarSign} /></div>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><h2 className="font-display font-semibold text-slate-900">Your Chama</h2><p className="mt-2 text-sm text-slate-500">{user?.chama && user.chama !== 'No Chama / Individual Borrower' ? `You are registered with ${user.chama}. Your group affiliation is included in loan assessment.` : 'You are registered as an individual borrower. Ask an agent to update your Chama affiliation if this changes.'}</p></section>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><h2 className="font-display font-semibold text-slate-900">Your next step</h2><p className="mt-2 text-sm text-slate-500">Keep your repayments on schedule to strengthen your credit profile and unlock future financing.</p></section>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display font-semibold text-slate-900">Transaction history</h2><p className="mt-1 text-sm text-slate-500">All scheduled repayments and recorded payment activity for your loans.</p></div><span className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{transactions.length} transactions</span></div>{transactions.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-brand-100 text-xs uppercase text-slate-400"><tr><th className="px-2 py-3 font-medium">Date</th><th className="px-2 py-3 font-medium">Description</th><th className="px-2 py-3 font-medium">Amount</th><th className="px-2 py-3 font-medium">Status</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={`${transaction.loanId}-${transaction.number}`} className="border-b border-brand-50 last:border-0"><td className="px-2 py-3 text-slate-600">{transaction.dueDate}</td><td className="px-2 py-3 text-slate-800">{transaction.purpose} · Installment {transaction.number}</td><td className="px-2 py-3 font-medium text-slate-900">KES {money(transaction.amount)}</td><td className="px-2 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${transaction.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{transaction.status}</span></td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">Your transactions will appear here once a loan is approved and scheduled.</p>}</section>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display font-semibold text-slate-900">Loan requests</h2><p className="mt-1 text-sm text-slate-500">Track every application from review through disbursement.</p></div><span className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">Estimated eligible: KES {money(estimatedLimit)}</span></div>
      {renewalNotice && <p role="status" className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{renewalNotice}</p>}
      {applications.length ? <div className="mt-4 grid gap-3">{applications.map((loan) => {
        const canPay = PAYABLE_STATUSES.includes(loan.status);
        const canViewInterest = ['Approved', 'Repaying', 'Closed'].includes(loan.status) && loan.interestRate;
        const canRenew = ['Repaying', 'Closed'].includes(loan.status) && loan.outstanding === 0 && !loan.renewalRequested;
        return <article key={loan.id} className="rounded-xl border border-brand-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Individual loan</span><p className="mt-2 font-semibold text-slate-900">KES {money(loan.amount)} <span className="font-normal text-slate-500">· {loan.purpose || 'Loan request'}</span></p><p className="mt-1 text-xs text-slate-500">Requested {loan.appliedAt} · {loan.duration} months · {loan.frequency}</p>{loan.rejectionReason && <p className="mt-2 text-xs text-red-600">Reason: {loan.rejectionReason}</p>}{loan.renewalRequested && <p className="mt-2 text-xs text-brand-700">Renewal requested · Under review</p>}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${loan.status === 'Rejected' ? 'bg-red-50 text-red-700' : loan.status === 'Pending' ? 'bg-amber-50 text-amber-700' : loan.status === 'Repaying' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>{loan.status}</span>
          </div>
          {(canPay || canViewInterest || canRenew) && <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-50 pt-3">
            {canPay && <button type="button" onClick={() => openPayment(loan)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"><Wallet size={14} /> Make a payment</button>}
            {canViewInterest && <button type="button" onClick={() => setInterestLoan(loan)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"><TrendingUp size={14} /> View interest growth</button>}
            {canRenew && <button type="button" onClick={() => openRenewal(loan)} className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">Request renewal</button>}
          </div>}
        </article>;
      })}</div> : <p className="mt-4 text-sm text-slate-500">You have not submitted any loan requests yet.</p>}
    </section>
    {isRequestOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="loan-request-title"><form onSubmit={submitRequest} noValidate className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="loan-request-title" className="font-display text-xl font-semibold text-slate-900">Request a loan</h2><p className="mt-1 text-sm text-slate-500">Your request will be sent to an agent for review.</p></div><button type="button" onClick={() => setIsRequestOpen(false)} aria-label="Close loan request form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Based on the financial information in your profile, your estimated eligibility is up to <strong>KES {money(estimatedLimit)}</strong>. This is an estimate, not a loan approval.</p><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount needed (KES)<input className="app-field h-11 px-3" type="number" min="1000" max={estimatedLimit} value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="e.g. 25,000" required /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">What will you use the loan for?<textarea className="app-field min-h-24 px-3 py-2" value={form.purpose} onChange={(event) => updateField('purpose', event.target.value)} placeholder="e.g. Buy stock for my business" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment term<select className="app-field h-11 px-3" value={form.duration} onChange={(event) => updateField('duration', event.target.value)}><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment frequency<select className="app-field h-11 px-3" value={form.frequency} onChange={(event) => updateField('frequency', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div></div>{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}<button type="submit" disabled={requestSubmitting} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"><Send size={17} /> {requestSubmitting ? 'Submitting…' : 'Submit loan request'}</button></form></div>}
    {payLoan && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="pay-loan-title"><form onSubmit={submitPayment} noValidate className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="pay-loan-title" className="font-display text-xl font-semibold text-slate-900">Make a payment</h2><p className="mt-1 text-sm text-slate-500">Loan {payLoan.id.slice(0, 8)} · Outstanding KES {money(payLoan.outstanding)}</p></div><button type="button" onClick={() => setPayLoan(null)} aria-label="Close payment form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount to pay (KES)<input className="app-field h-11 px-3" type="number" min="1" step="0.01" value={payForm.amount} onChange={(event) => updatePayField('amount', event.target.value)} required /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Payment method<select className="app-field h-11 px-3" value={payForm.method} onChange={(event) => updatePayField('method', event.target.value)}><option>M-Pesa</option><option>Stripe</option></select></label>{payForm.method === 'M-Pesa' && <label className="grid gap-1.5 text-sm font-medium text-slate-700">M-Pesa phone number<input className="app-field h-11 px-3" value={payForm.phoneNumber} onChange={(event) => updatePayField('phoneNumber', event.target.value)} placeholder="e.g. 0712345678" required /></label>}</div>{payError && <p role="alert" className="mt-4 text-sm text-red-600">{payError}</p>}{paySuccess && <p role="status" className="mt-4 text-sm font-medium text-brand-700">{paySuccess}</p>}
      {payForm.method === 'M-Pesa' && !paySuccess && <button type="submit" disabled={paySubmitting} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"><Wallet size={17} /> {paySubmitting ? 'Sending prompt…' : 'Send M-Pesa prompt'}</button>}
      {payForm.method === 'Stripe' && !paySuccess && payAmountValid && <CustomerStripePayment loanId={payLoan.id} amountKES={payAmount} onSuccess={handleStripeSuccess} onError={setPayError} />}
    </form></div>}
    {interestLoan && interestBreakdown && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="interest-title"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="interest-title" className="font-display text-xl font-semibold text-slate-900">Interest growth</h2><p className="mt-1 text-sm text-slate-500">Loan {interestLoan.id.slice(0, 8)} · KES {money(interestBreakdown.principal)} at {interestLoan.interestRate}% for {interestLoan.duration} months</p></div><button type="button" onClick={() => setInterestLoan(null)} aria-label="Close interest growth" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-brand-50 p-3"><p className="text-xs text-brand-600">Total interest</p><p className="mt-1 font-display text-lg font-semibold text-brand-800">KES {money(interestBreakdown.interestTotal)}</p></div>
        <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-600">Interest paid</p><p className="mt-1 font-display text-lg font-semibold text-amber-800">KES {money(interestBreakdown.interestPaid)}</p></div>
        <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Interest remaining</p><p className="mt-1 font-display text-lg font-semibold text-slate-800">KES {money(interestBreakdown.interestRemaining)}</p></div>
        <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Total repayable</p><p className="mt-1 font-display text-lg font-semibold text-slate-800">KES {money(interestBreakdown.total)}</p></div>
      </div>
      <div className="mt-5 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" />Principal</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Interest</span></div>
      <div className="mt-2 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={interestBreakdown.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eef3ec" vertical={false} />
            <XAxis dataKey="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'Installment', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value, name) => [`KES ${money(value)}`, name === 'cumulativeInterest' ? 'Cumulative interest' : 'Cumulative principal']} labelFormatter={(value) => `Installment ${value}`} />
            <Area type="monotone" dataKey="cumulativePrincipal" stackId="1" stroke="#3f7d2e" fill="#3f7d2e" fillOpacity={0.25} />
            <Area type="monotone" dataKey="cumulativeInterest" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-slate-500">This shows how much of your total repayment (principal vs. interest) accumulates as you complete each installment.</p>
    </div></div>}
    {renewalLoan && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="renewal-title"><form onSubmit={submitRenewal} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="renewal-title" className="font-display text-xl font-semibold text-slate-900">Request loan renewal</h2><p className="mt-1 text-sm text-slate-500">Your request will be reviewed before any funds are disbursed.</p></div><button type="button" onClick={() => setRenewalLoan(null)} aria-label="Close renewal form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Renewal amount (KES)<input required min="1000" type="number" value={renewalForm.amount} onChange={(event) => setRenewalForm((current) => ({ ...current, amount: event.target.value }))} className="app-field h-11 px-3" /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Term<select value={renewalForm.duration} onChange={(event) => setRenewalForm((current) => ({ ...current, duration: event.target.value }))} className="app-field h-11 px-3"><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label></div><button type="submit" className="mt-5 h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Submit renewal request</button></form></div>}
  </AppShell>;
}

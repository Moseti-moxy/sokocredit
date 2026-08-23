import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, Send, TrendingUp, Wallet, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { applyRepayment, generateSchedule, getInterestBreakdown, money } from '../features/loans/api/loansApi';
import { createLoanRequestNotifications, createRepaymentNotification } from '../features/notifications/notifications';
import { createCustomerNotification } from '../features/communications/communicationsSlice';

const LOANS_STORAGE_KEY = 'sokocredit-loans-v2';
const PAYABLE_STATUSES = ['Disbursed', 'Repaying'];

function getAllLoans() {
  try {
    const loans = JSON.parse(localStorage.getItem(LOANS_STORAGE_KEY) || '[]');
    return Array.isArray(loans) ? loans : [];
  } catch { return []; }
}

function getApplications(customerId) {
  return getAllLoans().filter((loan) => loan.customerId === customerId);
}

function saveApplication(application) {
  localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify([application, ...getAllLoans()]));
}

function updateStoredLoan(loanId, changes) {
  localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(getAllLoans().map((loan) => (loan.id === loanId ? { ...loan, ...changes } : loan))));
}

function getLoanSummary(loans) {
  const activeLoans = loans.filter((loan) => PAYABLE_STATUSES.includes(loan.status));
  const outstanding = activeLoans.reduce((total, loan) => total + Math.max(0, Number(loan.amount || 0) - Number(loan.paid || 0)), 0);
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
  const dispatch = useDispatch();
  const customers = useSelector((state) => state.customers.list);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [applications, setApplications] = useState(() => getApplications(user?.id));
  const [form, setForm] = useState({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
  const [error, setError] = useState('');
  const [payLoan, setPayLoan] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'M-Pesa', reference: '' });
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [interestLoan, setInterestLoan] = useState(null);
  const pendingApplication = applications.find((loan) => loan.status === 'Pending');
  const { outstanding, nextRepayment } = useMemo(() => getLoanSummary(applications), [applications]);
  const estimatedLimit = useMemo(() => {
    const dailyProfit = Number(user?.dailyProfit || 0);
    return Math.min(500000, Math.max(10000, dailyProfit ? dailyProfit * 26 * 3 : 50000));
  }, [user?.dailyProfit]);
  const interestBreakdown = useMemo(() => (interestLoan ? getInterestBreakdown(interestLoan) : null), [interestLoan]);

  useEffect(() => {
    const refresh = () => setApplications(getApplications(user?.id));
    const onStorage = (event) => { if (event.key === LOANS_STORAGE_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user?.id]);

  function updateField(field, value) { setError(''); setForm((current) => ({ ...current, [field]: value })); }
  function submitRequest(event) {
    event.preventDefault();
    const amount = Number(form.amount); const duration = Number(form.duration);
    if (!Number.isFinite(amount) || amount < 1000 || amount > estimatedLimit || !form.purpose.trim() || !Number.isFinite(duration) || duration < 1 || duration > 24) {
      setError(`Enter an amount between KES 1,000 and your estimated eligibility of KES ${money(estimatedLimit)}, your loan purpose, and a term of 1–24 months.`); return;
    }
    const customerName = user?.name || 'SokoCredit customer';
    const chamaName = user?.chama && user.chama !== 'No Chama / Individual Borrower' ? user.chama : ''; const chamaMemberCount = chamaName ? customers.filter((customer) => customer.chama === chamaName).length : 0;
    const application = { id: `L-${Date.now().toString().slice(-6)}`, customerId: user?.id, customer: customerName, initials: customerName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase(), business: user?.business || 'Market trader', amount, interestRate: 10, duration, frequency: form.frequency, purpose: form.purpose.trim(), loanType: 'individual', chamaName, chamaMemberCount, paid: 0, progress: 0, status: 'Pending', due: 'Awaiting approval', appliedAt: new Date().toISOString().slice(0, 10), schedule: generateSchedule({ amount, interestRate: 10, duration, frequency: form.frequency }) };
    saveApplication(application);
    createLoanRequestNotifications(application);
    dispatch(createCustomerNotification({
      userId: user?.id,
      type: 'application_received',
      title: 'Loan Application Received',
      body: `We have received your loan request for KES ${amount.toLocaleString()}. Our team will review it and update you shortly.`,
      refId: application.id,
      deliveryChannel: 'WhatsApp',
    }));
    setApplications((current) => [application, ...current]); setIsRequestOpen(false); setForm({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
  }

  function openPayment(loan) {
    const nextItem = (loan.schedule || []).find((item) => item.status !== 'Paid');
    const loanOutstanding = Math.max(0, Number(loan.amount || 0) - Number(loan.paid || 0));
    const defaultAmount = nextItem ? Math.max(0, Number(nextItem.amount) - Number(nextItem.paidAmount || 0)) : loanOutstanding;
    setPayForm({ amount: defaultAmount ? String(Math.round(defaultAmount * 100) / 100) : '', method: 'M-Pesa', reference: '' });
    setPayError(''); setPaySuccess(''); setPayLoan(loan);
  }
  function updatePayField(field, value) { setPayError(''); setPayForm((current) => ({ ...current, [field]: value })); }
  function submitPayment(event) {
    event.preventDefault();
    const amount = Number(payForm.amount);
    const loanOutstanding = Math.max(0, Number(payLoan.amount || 0) - Number(payLoan.paid || 0));
    if (!Number.isFinite(amount) || amount < 1 || amount > loanOutstanding) {
      setPayError(`Enter an amount between KES 1 and your outstanding balance of KES ${money(loanOutstanding)}.`); return;
    }
    if (payForm.method === 'M-Pesa' && !payForm.reference.trim()) { setPayError('Enter the M-Pesa confirmation code for this payment.'); return; }
    const result = applyRepayment(payLoan, { amount, method: payForm.method, reference: payForm.reference.trim() });
    if (!result) { setPayError('This loan has no outstanding repayment balance.'); return; }
    updateStoredLoan(payLoan.id, result.changes);
    createRepaymentNotification({ customer: user?.name || 'Customer', amount: result.applied, loanId: payLoan.id });
    dispatch(createCustomerNotification({
      userId: user?.id,
      type: 'payment_confirmation',
      title: 'Payment received',
      body: `We received your KES ${result.applied.toLocaleString()} payment for loan ${payLoan.id} via ${payForm.method}.`,
      refId: payLoan.id,
      deliveryChannel: 'WhatsApp',
    }));
    setApplications((current) => current.map((loan) => (loan.id === payLoan.id ? { ...loan, ...result.changes } : loan)));
    setPaySuccess(`Payment of KES ${money(result.applied)} recorded. Thank you!`);
    setTimeout(() => setPayLoan(null), 1500);
  }

  return <AppShell title={`Welcome, ${user?.name?.split(' ')[0] || 'Customer'}`} subtitle="Your SokoCredit account overview">
    <div className="rounded-2xl bg-brand-700 p-6 text-white sm:p-8"><p className="text-sm text-brand-100">Customer name</p><p className="mt-1 font-display text-xl font-semibold">{user?.name || 'Customer'}</p><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-lg text-sm text-brand-100">View your active loan, repayment dates, and account activity in one simple place.</p><button type="button" onClick={() => setIsRequestOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"><Banknote size={18} /> Request a loan</button></div></div>
    {pendingApplication && <section className="mt-6 flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800"><CheckCircle2 className="mt-0.5 shrink-0 text-brand-600" size={20} /><div><p className="font-semibold">Your loan request is being reviewed</p><p className="mt-1">KES {money(pendingApplication.amount)} for {pendingApplication.purpose}. We will update you once an agent has reviewed it.</p></div></section>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Active loan" value={outstanding ? `KES ${money(outstanding)}` : 'No active loan'} deltaLabel={outstanding ? 'Current balance' : 'Apply for a loan to get started'} icon={CreditCard} /><StatCard label="Next repayment" value={nextRepayment ? `KES ${money(nextRepayment.amount)}` : 'No repayment due'} deltaLabel={displayDueDate(nextRepayment?.dueDate)} icon={CalendarDays} /><StatCard label="Account status" value="Active" deltaLabel="Your account is ready for loan requests" icon={CircleDollarSign} /></div>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><h2 className="font-display font-semibold text-slate-900">Your Chama</h2><p className="mt-2 text-sm text-slate-500">{user?.chama && user.chama !== 'No Chama / Individual Borrower' ? `You are registered with ${user.chama}. Your group affiliation is included in loan assessment.` : 'You are registered as an individual borrower. Ask an agent to update your Chama affiliation if this changes.'}</p></section>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><h2 className="font-display font-semibold text-slate-900">Your next step</h2><p className="mt-2 text-sm text-slate-500">Keep your repayments on schedule to strengthen your credit profile and unlock future financing.</p></section>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display font-semibold text-slate-900">Loan requests</h2><p className="mt-1 text-sm text-slate-500">Track every application from review through disbursement.</p></div><span className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">Estimated eligible: KES {money(estimatedLimit)}</span></div>
      {applications.length ? <div className="mt-4 grid gap-3">{applications.map((loan) => {
        const canPay = PAYABLE_STATUSES.includes(loan.status);
        const canViewInterest = ['Disbursed', 'Repaying', 'Closed'].includes(loan.status) && loan.interestRate;
        return <article key={loan.id} className="rounded-xl border border-brand-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${loan.loanType === 'chama' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{loan.loanType === 'chama' ? 'Chama group loan' : 'Individual loan'}</span><p className="mt-2 font-semibold text-slate-900">KES {money(loan.amount)} <span className="font-normal text-slate-500">· {loan.purpose || 'Loan request'}</span></p><p className="mt-1 text-xs text-slate-500">Requested {loan.appliedAt} · {loan.duration} months · {loan.frequency}</p>{loan.rejectionReason && <p className="mt-2 text-xs text-red-600">Reason: {loan.rejectionReason}</p>}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${loan.status === 'Rejected' ? 'bg-red-50 text-red-700' : loan.status === 'Pending' ? 'bg-amber-50 text-amber-700' : loan.status === 'Repaying' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>{loan.status}</span>
          </div>
          {(canPay || canViewInterest) && <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-50 pt-3">
            {canPay && <button type="button" onClick={() => openPayment(loan)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"><Wallet size={14} /> Make a payment</button>}
            {canViewInterest && <button type="button" onClick={() => setInterestLoan(loan)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"><TrendingUp size={14} /> View interest growth</button>}
          </div>}
        </article>;
      })}</div> : <p className="mt-4 text-sm text-slate-500">You have not submitted any loan requests yet.</p>}
    </section>
    {isRequestOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="loan-request-title"><form onSubmit={submitRequest} noValidate className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="loan-request-title" className="font-display text-xl font-semibold text-slate-900">Request a loan</h2><p className="mt-1 text-sm text-slate-500">Your request will be sent to an agent for review.</p></div><button type="button" onClick={() => setIsRequestOpen(false)} aria-label="Close loan request form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Based on the financial information in your profile, your estimated eligibility is up to <strong>KES {money(estimatedLimit)}</strong>. This is an estimate, not a loan approval.</p><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount needed (KES)<input className="app-field h-11 px-3" type="number" min="1000" max={estimatedLimit} value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="e.g. 25,000" required /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">What will you use the loan for?<textarea className="app-field min-h-24 px-3 py-2" value={form.purpose} onChange={(event) => updateField('purpose', event.target.value)} placeholder="e.g. Buy stock for my business" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment term<select className="app-field h-11 px-3" value={form.duration} onChange={(event) => updateField('duration', event.target.value)}><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment frequency<select className="app-field h-11 px-3" value={form.frequency} onChange={(event) => updateField('frequency', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div></div>{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}<button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"><Send size={17} /> Submit loan request</button></form></div>}
    {payLoan && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="pay-loan-title"><form onSubmit={submitPayment} noValidate className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="pay-loan-title" className="font-display text-xl font-semibold text-slate-900">Make a payment</h2><p className="mt-1 text-sm text-slate-500">Loan {payLoan.id} · Outstanding KES {money(Math.max(0, Number(payLoan.amount || 0) - Number(payLoan.paid || 0)))}</p></div><button type="button" onClick={() => setPayLoan(null)} aria-label="Close payment form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount to pay (KES)<input className="app-field h-11 px-3" type="number" min="1" step="0.01" value={payForm.amount} onChange={(event) => updatePayField('amount', event.target.value)} required /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Payment method<select className="app-field h-11 px-3" value={payForm.method} onChange={(event) => updatePayField('method', event.target.value)}><option>M-Pesa</option><option>Cash</option></select></label>{payForm.method === 'M-Pesa' && <label className="grid gap-1.5 text-sm font-medium text-slate-700">M-Pesa confirmation code<input className="app-field h-11 px-3" value={payForm.reference} onChange={(event) => updatePayField('reference', event.target.value)} placeholder="e.g. QCX7T9K2LM" required /></label>}</div>{payError && <p role="alert" className="mt-4 text-sm text-red-600">{payError}</p>}{paySuccess && <p role="status" className="mt-4 text-sm font-medium text-brand-700">{paySuccess}</p>}<button type="submit" disabled={Boolean(paySuccess)} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"><Wallet size={17} /> Confirm payment</button></form></div>}
    {interestLoan && interestBreakdown && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="interest-title"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="interest-title" className="font-display text-xl font-semibold text-slate-900">Interest growth</h2><p className="mt-1 text-sm text-slate-500">Loan {interestLoan.id} · KES {money(interestBreakdown.principal)} at {interestLoan.interestRate}% for {interestLoan.duration} months</p></div><button type="button" onClick={() => setInterestLoan(null)} aria-label="Close interest growth" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
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
  </AppShell>;
}

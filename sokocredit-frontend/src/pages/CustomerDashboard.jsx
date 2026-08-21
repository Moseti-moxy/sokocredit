import { useState } from 'react';
import { Banknote, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, Send, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { generateSchedule, money } from '../features/loans/api/loansApi';
import { createLoanRequestNotifications } from '../features/notifications/notifications';

const LOANS_STORAGE_KEY = 'sokocredit-loans-v2';

function getApplications(customerId) {
  try {
    const loans = JSON.parse(localStorage.getItem(LOANS_STORAGE_KEY) || '[]');
    return Array.isArray(loans) ? loans.filter((loan) => loan.customerId === customerId) : [];
  } catch { return []; }
}

function saveApplication(application) {
  const stored = JSON.parse(localStorage.getItem(LOANS_STORAGE_KEY) || '[]');
  const loans = Array.isArray(stored) ? stored : [];
  localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify([application, ...loans]));
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [applications, setApplications] = useState(() => getApplications(user?.id));
  const [form, setForm] = useState({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
  const [error, setError] = useState('');
  const pendingApplication = applications.find((loan) => loan.status === 'Pending');

  function updateField(field, value) { setError(''); setForm((current) => ({ ...current, [field]: value })); }
  function submitRequest(event) {
    event.preventDefault();
    const amount = Number(form.amount); const duration = Number(form.duration);
    if (!Number.isFinite(amount) || amount < 1000 || amount > 500000 || !form.purpose.trim() || !Number.isFinite(duration) || duration < 1 || duration > 24) {
      setError('Enter an amount between KES 1,000 and 500,000, your loan purpose, and a term of 1–24 months.'); return;
    }
    const customerName = user?.name || 'SokoCredit customer';
    const application = { id: `L-${Date.now().toString().slice(-6)}`, customerId: user?.id, customer: customerName, initials: customerName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase(), business: user?.business || 'Market trader', amount, interestRate: 10, duration, frequency: form.frequency, purpose: form.purpose.trim(), paid: 0, progress: 0, status: 'Pending', due: 'Awaiting approval', appliedAt: new Date().toISOString().slice(0, 10), schedule: generateSchedule({ amount, interestRate: 10, duration, frequency: form.frequency }) };
    saveApplication(application);
    createLoanRequestNotifications(application);
    setApplications((current) => [application, ...current]); setIsRequestOpen(false); setForm({ amount: '', purpose: '', duration: '3', frequency: 'monthly' });
  }

  return <AppShell title={`Welcome, ${user?.name?.split(' ')[0] || 'Customer'}`} subtitle="Your SokoCredit account overview">
    <div className="rounded-2xl bg-brand-700 p-6 text-white sm:p-8"><p className="text-sm text-brand-100">Customer ID</p><p className="mt-1 font-display text-xl font-semibold">{user?.id}</p><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-lg text-sm text-brand-100">View your active loan, repayment dates, and account activity in one simple place.</p><button type="button" onClick={() => setIsRequestOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"><Banknote size={18} /> Request a loan</button></div></div>
    {pendingApplication && <section className="mt-6 flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800"><CheckCircle2 className="mt-0.5 shrink-0 text-brand-600" size={20} /><div><p className="font-semibold">Your loan request is being reviewed</p><p className="mt-1">KES {money(pendingApplication.amount)} for {pendingApplication.purpose}. We will update you once a loan officer has reviewed it.</p></div></section>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Active loan" value="KES 45,000" deltaLabel="Current balance" icon={CreditCard} /><StatCard label="Next repayment" value="KES 3,750" deltaLabel="Due 28 Aug 2026" icon={CalendarDays} /><StatCard label="Account status" value="Active" deltaLabel="Payments up to date" icon={CircleDollarSign} /></div>
    <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5"><h2 className="font-display font-semibold text-slate-900">Your next step</h2><p className="mt-2 text-sm text-slate-500">Keep your repayments on schedule to strengthen your credit profile and unlock future financing.</p></section>
    {isRequestOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="loan-request-title"><form onSubmit={submitRequest} noValidate className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="loan-request-title" className="font-display text-xl font-semibold text-slate-900">Request a loan</h2><p className="mt-1 text-sm text-slate-500">Your request will be sent to a loan officer for review.</p></div><button type="button" onClick={() => setIsRequestOpen(false)} aria-label="Close loan request form" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount needed (KES)<input className="app-field h-11 px-3" type="number" min="1000" max="500000" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="e.g. 25,000" required /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">What will you use the loan for?<textarea className="app-field min-h-24 px-3 py-2" value={form.purpose} onChange={(event) => updateField('purpose', event.target.value)} placeholder="e.g. Buy stock for my business" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment term<select className="app-field h-11 px-3" value={form.duration} onChange={(event) => updateField('duration', event.target.value)}><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Repayment frequency<select className="app-field h-11 px-3" value={form.frequency} onChange={(event) => updateField('frequency', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div></div>{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}<button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"><Send size={17} /> Submit loan request</button></form></div>}
  </AppShell>;
}

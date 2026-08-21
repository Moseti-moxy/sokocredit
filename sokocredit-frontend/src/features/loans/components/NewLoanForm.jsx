import { useMemo, useState } from 'react'
import { calculateRepayment, customers as fallbackCustomers, money } from '../api/loansApi'

const input = 'app-field h-11 w-full px-3 text-sm'

export default function NewLoanForm({ onCreate, customers = fallbackCustomers, initialCustomerId = '', chamaName = '', chamaMemberCount = 0, isGroupLoan = false }) {
  const [form, setForm] = useState({ customerId: initialCustomerId, amount: '', purpose: '', rate: '', duration: '1', frequency: 'monthly' })
  const [error, setError] = useState('')
  const selectedCustomer = customers.find((customer) => customer.id === form.customerId)
  const preview = useMemo(() => calculateRepayment(form.amount, form.rate, form.duration, form.frequency), [form])
  const valid = selectedCustomer && form.purpose.trim() && Number(form.amount) >= 1000 && Number(form.amount) <= 500000 && Number(form.rate) >= 0 && Number(form.rate) <= 100 && Number(form.duration) > 0
  const change = (key, value) => { setError(''); setForm((current) => ({ ...current, [key]: value })) }
  const submit = (event) => {
    event.preventDefault()
    if (!valid) return setError('Choose a customer and enter an amount between KES 1,000 and 500,000.')
    onCreate({ ...form, purpose: form.purpose.trim(), customer: selectedCustomer.name, business: selectedCustomer.business, initials: selectedCustomer.name.split(' ').map((part) => part[0]).join('').slice(0, 2), loanType: isGroupLoan ? 'chama' : 'individual', chamaName, chamaMemberCount, repayment: preview })
    setForm({ customerId: '', amount: '', purpose: '', rate: '', duration: '1', frequency: 'monthly' })
  }
  return <form className="app-surface grid h-max gap-4 p-5" onSubmit={submit} noValidate>
    <div><h2 className="mb-1 font-display text-xl font-semibold text-slate-900">{isGroupLoan ? 'New Chama Group Loan' : 'New Individual Loan'}</h2><p className="text-sm text-slate-500">Applications start as pending.</p></div>
    {!isGroupLoan && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Individual loan</strong><br />This application belongs to the selected customer only.</div>}
    {isGroupLoan && <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800"><strong>{chamaName}</strong><br />Group loan for {chamaMemberCount} member{chamaMemberCount === 1 ? '' : 's'}. The selected customer is the chairperson.</div>}
    <label className="grid gap-2 text-xs font-semibold text-slate-600">Customer<select className={input} value={form.customerId} onChange={(e) => change('customerId', e.target.value)} required><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.business}</option>)}</select></label>
    <label className="grid gap-2 text-xs font-semibold text-slate-600">Amount (KES)<input className={input} required type="number" min="1000" max="500000" value={form.amount} onChange={(e) => change('amount', e.target.value)} placeholder="1,000 – 500,000" /></label>
    <label className="grid gap-2 text-xs font-semibold text-slate-600">Loan purpose<textarea className="app-field min-h-20 w-full px-3 py-2 text-sm" required value={form.purpose} onChange={(e) => change('purpose', e.target.value)} placeholder="e.g. Purchase stock for the business" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-xs font-semibold text-slate-600">Interest (%)<input className={input} required type="number" min="0" max="100" value={form.rate} onChange={(e) => change('rate', e.target.value)} placeholder="10" /></label><label className="grid gap-2 text-xs font-semibold text-slate-600">Term (months)<input className={input} required type="number" min="1" max="24" value={form.duration} onChange={(e) => change('duration', e.target.value)} /></label></div>
    <label className="grid gap-2 text-xs font-semibold text-slate-600">Repayment frequency<select className={input} value={form.frequency} onChange={(e) => change('frequency', e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
    {preview.installments > 0 && <div className="grid gap-1 rounded-lg bg-brand-50 p-3 text-sm text-slate-600"><span>Total interest: <b>KES {money(preview.interest)}</b></span><strong className="text-brand-700">KES {money(preview.installment)} × {preview.installments} installments</strong></div>}
    {error && <p role="alert" className="m-0 text-sm text-red-600">{error}</p>}<button className="h-11 rounded-xl border-0 bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45" disabled={!valid}>Submit application</button>
  </form>
}

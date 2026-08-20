import { useMemo, useState } from 'react'
import { calculateRepayment, customers, money } from '../api/loansApi'

const input = 'h-11 border border-[#bdc8b6] bg-white px-3 text-base text-[#374151] outline-[#508d27]'

export default function NewLoanForm({ onCreate }) {
  const [form, setForm] = useState({ customerId: '', amount: '', rate: '', duration: '1', frequency: 'monthly' })
  const [error, setError] = useState('')
  const selectedCustomer = customers.find((customer) => customer.id === form.customerId)
  const preview = useMemo(() => calculateRepayment(form.amount, form.rate, form.duration, form.frequency), [form])
  const valid = selectedCustomer && Number(form.amount) >= 1000 && Number(form.amount) <= 500000 && Number(form.rate) >= 0 && Number(form.rate) <= 100 && Number(form.duration) > 0
  const change = (key, value) => { setError(''); setForm((current) => ({ ...current, [key]: value })) }
  const submit = (event) => {
    event.preventDefault()
    if (!valid) return setError('Choose a customer and enter an amount between KES 1,000 and 500,000.')
    onCreate({ ...form, customer: selectedCustomer.name, business: selectedCustomer.business, initials: selectedCustomer.name.split(' ').map((part) => part[0]).join('').slice(0, 2), repayment: preview })
    setForm({ customerId: '', amount: '', rate: '', duration: '1', frequency: 'monthly' })
  }
  return <form className="grid h-max gap-4 rounded-lg border border-[#e9ebe5] p-5" onSubmit={submit} noValidate>
    <div><h2 className="mb-1 text-2xl font-bold">New Loan Application</h2><p className="text-sm text-[#5c635a]">Applications start as pending.</p></div>
    <label className="grid gap-2 text-sm font-bold text-[#535a52]">Customer<select className={input} value={form.customerId} onChange={(e) => change('customerId', e.target.value)} required><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.business}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-bold text-[#535a52]">Amount (KES)<input className={input} required type="number" min="1000" max="500000" value={form.amount} onChange={(e) => change('amount', e.target.value)} placeholder="1,000 – 500,000" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold text-[#535a52]">Interest (%)<input className={input} required type="number" min="0" max="100" value={form.rate} onChange={(e) => change('rate', e.target.value)} placeholder="10" /></label><label className="grid gap-2 text-sm font-bold text-[#535a52]">Term (months)<input className={input} required type="number" min="1" max="24" value={form.duration} onChange={(e) => change('duration', e.target.value)} /></label></div>
    <label className="grid gap-2 text-sm font-bold text-[#535a52]">Repayment frequency<select className={input} value={form.frequency} onChange={(e) => change('frequency', e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
    {preview.installments > 0 && <div className="grid gap-1 bg-[#eff7e9] p-3 text-sm text-[#4f5c4e]"><span>Total interest: <b>KES {money(preview.interest)}</b></span><strong className="text-[#307303]">KES {money(preview.installment)} × {preview.installments} installments</strong></div>}
    {error && <p role="alert" className="m-0 text-sm text-[#bc1511]">{error}</p>}<button className="h-11 border-0 bg-[#397d09] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!valid}>Submit application</button>
  </form>
}

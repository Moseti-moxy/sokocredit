import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { loans as seedLoans, generateSchedule } from '../api/loansApi'
import NewLoanForm from '../components/NewLoanForm'
import LoanTable from '../components/LoanTable'
import { DisbursementQueue, LoanDetail, PendingQueue } from '../components/LoanWorkflow'
import { ConfirmationModal, LoanAlert } from '../components/LoanAlert'
import AppShell from '../../../components/AppShell'
import { createCustomerNotification } from '../../notifications/notifications'

const storageKey = 'sokocredit-loans-v2'
const savedLoans = () => { try { const data = JSON.parse(localStorage.getItem(storageKey)); return Array.isArray(data) ? data : seedLoans } catch { return seedLoans } }

export default function LoanManagementPage() {
  const [searchParams] = useSearchParams()
  const customers = useSelector((state) => state.customers.list)
  const requestedView = searchParams.get('view')
  const requestedCustomerId = searchParams.get('customer') || ''
  const requestedChama = searchParams.get('chama') || ''
  const requestedMemberCount = Number(searchParams.get('members') || 0)
  const isGroupLoan = searchParams.get('groupLoan') === '1'
  const [loans, setLoans] = useState(savedLoans); const [search, setSearch] = useState(''); const [status, setStatus] = useState('All Status'); const [notice, setNotice] = useState(null); const [view, setView] = useState(requestedView === 'disburse' ? 'disburse' : 'portfolio'); const [selectedId, setSelectedId] = useState(null); const [confirmation, setConfirmation] = useState(null)
  const role = useSelector((state) => state.auth.role === 'admin' ? 'manager' : 'loan_officer')
  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(loans)), [loans])
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(timer) }, [notice])
  const shown = useMemo(() => loans.filter((loan) => loan.customer.toLowerCase().includes(search.toLowerCase()) && (status === 'All Status' || (status === 'Overdue' ? loan.status.includes('Overdue') : loan.status === status))), [loans, search, status])
  const update = (id, changes) => setLoans((items) => items.map((loan) => loan.id === id ? { ...loan, ...changes } : loan))
  const create = (form) => { const customer = customers.find((item) => item.id === form.customerId); const chamaName = form.chamaName || (customer?.chama && customer.chama !== 'No Chama / Individual Borrower' ? customer.chama : ''); const chamaMemberCount = form.chamaMemberCount || (chamaName ? customers.filter((item) => item.chama === chamaName).length : 0); const loan = { id: `L-${Date.now().toString().slice(-5)}`, customerId: form.customerId, customer: form.customer, initials: form.initials, business: form.business, amount: Number(form.amount), interestRate: Number(form.rate), duration: Number(form.duration), frequency: form.frequency, purpose: form.purpose, loanType: form.loanType || 'individual', chamaName, chamaMemberCount, paid: 0, progress: 0, status: 'Pending', due: 'Awaiting approval', appliedAt: new Date().toISOString().slice(0, 10), schedule: generateSchedule({ amount: form.amount, interestRate: form.rate, duration: form.duration, frequency: form.frequency }) }; setLoans((items) => [loan, ...items]); setView('pending'); setNotice({ type: 'success', message: `${loan.loanType === 'chama' ? `${chamaName} group` : form.customer} application submitted for review.` }) }
  const approve = (loan, conditions) => setConfirmation({ title: 'Approve loan application?', message: `${loan.id} will move to the disbursement queue.`, actionLabel: 'Approve loan', confirm: () => { update(loan.id, { status: 'Approved', approvedAt: new Date().toISOString().slice(0, 10), conditions }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan request approved', message: `Your request for KES ${loan.amount.toLocaleString()} has been approved and is awaiting disbursement.` }); setNotice({ type: 'success', message: `${loan.id} approved and the customer notified.` }) } })
  const reject = (loan, reason, notes) => { update(loan.id, { status: 'Rejected', rejectedAt: new Date().toISOString().slice(0, 10), rejectionReason: reason, rejectionNotes: notes }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan request update', message: `Your request for KES ${loan.amount.toLocaleString()} was not approved. Reason: ${reason}.` }); setNotice({ type: 'success', message: `${loan.id} was rejected and the customer notified.` }) }
  const disburse = (loan, details) => setConfirmation({ title: 'Confirm disbursement?', message: `Record a KES ${loan.amount.toLocaleString()} ${details.method} disbursement for ${loan.customer}.`, actionLabel: 'Record disbursement', confirm: () => { update(loan.id, { status: 'Repaying', disbursedAt: details.date, disbursement: details, due: loan.schedule?.[0]?.dueDate || 'Scheduled' }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan disbursed', message: `KES ${loan.amount.toLocaleString()} has been disbursed via ${details.method}. Your next repayment is ${loan.schedule?.[0]?.dueDate || 'scheduled'}.` }); setNotice({ type: 'success', message: `${loan.id} disbursed via ${details.method} and the customer notified.` }) } })
  const saveSchedule = (loan, schedule) => { update(loan.id, { schedule, due: schedule.find((item) => item.status !== 'Paid')?.dueDate || 'Completed' }); setNotice({ type: 'success', message: `${loan.id} repayment schedule updated.` }) }
  const recordRepayment = (loan, payment) => {
    const schedule = loan.schedule?.length ? loan.schedule : generateSchedule(loan)
    let remaining = Number(payment.amount); let applied = 0
    const updatedSchedule = schedule.map((item) => {
      if (remaining <= 0 || item.status === 'Paid') return item
      const outstanding = Math.max(0, Number(item.amount) - Number(item.paidAmount || 0)); const allocation = Math.min(outstanding, remaining)
      remaining -= allocation; applied += allocation; const paidAmount = Number(item.paidAmount || 0) + allocation
      return { ...item, paidAmount, status: paidAmount >= Number(item.amount) ? 'Paid' : 'Partially Paid' }
    })
    if (!applied) return setNotice({ type: 'error', message: 'This loan has no outstanding repayment balance.' })
    const paid = Number(loan.paid || 0) + applied; const total = schedule.reduce((sum, item) => sum + Number(item.amount), 0); const complete = paid >= total - 0.01
    const repayment = { id: `RP-${Date.now().toString().slice(-6)}`, ...payment, amount: applied, date: payment.date || new Date().toISOString().slice(0, 10) }
    update(loan.id, { paid, progress: Math.min(100, Math.round((paid / total) * 100)), schedule: updatedSchedule, repayments: [...(loan.repayments || []), repayment], status: complete ? 'Closed' : 'Repaying', due: complete ? 'Completed' : updatedSchedule.find((item) => item.status !== 'Paid')?.dueDate })
    createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Repayment received', message: `We received your KES ${applied.toLocaleString()} repayment via ${payment.method}.` })
    setNotice({ type: 'success', message: `KES ${applied.toLocaleString()} repayment recorded and the customer notified.` })
  }
  const sendReminder = (loan, reminder) => { update(loan.id, { reminders: [...(loan.reminders || []), { ...reminder, sentAt: new Date().toISOString() }] }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Repayment reminder', message: reminder.note || `Please make your scheduled repayment for loan ${loan.id}.` }); setNotice({ type: 'success', message: `Automated ${reminder.channel} reminder queued for ${loan.customer}.` }) }
  const selected = loans.find((loan) => loan.id === selectedId)
  const tabs = [['portfolio', 'Portfolio'], ['pending', `Pending (${loans.filter((loan) => loan.status === 'Pending').length})`], ['disburse', 'Disbursements']]
  return <AppShell title="Loan Management" subtitle="Applications, approvals, disbursements and repayment schedules."><LoanAlert notice={notice} onClose={() => setNotice(null)} /><div className="flex flex-wrap gap-2 border-b border-[#e9ebe5]">{tabs.map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`border-b-2 px-3 py-3 text-sm font-bold ${view === key ? 'border-[#397d09] text-[#397d09]' : 'border-transparent text-[#5c635a]'}`}>{label}</button>)}</div>{view === 'portfolio' && <section className="mt-6 grid grid-cols-1 gap-[27px] lg:grid-cols-[340px_1fr]"><NewLoanForm key={`${requestedCustomerId}-${requestedChama}`} onCreate={create} customers={customers} initialCustomerId={requestedCustomerId} chamaName={requestedChama} chamaMemberCount={requestedMemberCount} isGroupLoan={isGroupLoan} /><section className="min-w-0"><div className="mb-4 flex flex-col items-start gap-3.5 md:flex-row md:items-center md:justify-between"><h2 className="m-0 text-2xl font-bold">Loan portfolio</h2><div className="flex w-full gap-3 md:w-auto"><label className="flex h-11 flex-1 items-center rounded-lg border border-[#bdc8b6] px-3 text-lg">⌕<input className="w-full border-0 pl-2 text-base outline-none md:w-[200px]" placeholder="Search customer..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="h-11 rounded-lg border border-[#bdc8b6] bg-white px-3 text-base" value={status} onChange={(event) => setStatus(event.target.value)}><option>All Status</option><option>Repaying</option><option>Overdue</option><option>Due Tomorrow</option><option>Pending</option><option>Approved</option></select></div></div><LoanTable loans={shown} onSelect={(loan) => setSelectedId(loan.id)} /></section></section>}{view === 'pending' && <section className="mt-6 max-w-3xl"><h2>Application review queue</h2><PendingQueue loans={loans} role={role} onApprove={approve} onReject={reject} /></section>}{view === 'disburse' && <section className="mt-6 max-w-3xl"><h2>Approved, awaiting disbursement</h2><DisbursementQueue loans={loans} onDisburse={disburse} /></section>}{selected && <LoanDetail key={`${selected.id}-${selected.paid}-${selected.reminders?.length || 0}-${selected.schedule?.[0]?.dueDate || ''}`} loan={selected} onClose={() => setSelectedId(null)} onSaveSchedule={saveSchedule} onRecordRepayment={recordRepayment} onSendReminder={sendReminder} />}<ConfirmationModal confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={() => { confirmation.confirm(); setConfirmation(null) }} /></AppShell>
}

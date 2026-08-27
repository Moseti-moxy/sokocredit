import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { loans as seedLoans, generateSchedule, applyRepayment } from '../api/loansApi'
import { approveBackendLoan, createBackendLoan, disburseBackendLoan, getBackendLoans } from '../api/mpesaApi'
import { loadCustomers } from '../../customers/customersSlice'
import NewLoanForm from '../components/NewLoanForm'
import LoanTable from '../components/LoanTable'
import { DisbursementQueue, LoanDetail, PendingQueue } from '../components/LoanWorkflow'
import { ConfirmationModal, LoanAlert } from '../components/LoanAlert'
import AppShell from '../../../components/AppShell'
import { createCustomerNotification } from '../../notifications/notifications'

const storageKey = 'sokocredit-loans-v2'
const savedLoans = () => { try { const data = JSON.parse(localStorage.getItem(storageKey)); return Array.isArray(data) ? data : seedLoans } catch { return seedLoans } }
const frontendLoan = (loan) => ({
  id: loan.id, customerId: loan.customerId, customer: loan.customerId, initials: String(loan.customerId || 'CU').slice(0, 2).toUpperCase(), business: loan.purpose || 'Loan customer', amount: Number(loan.amount), interestRate: Number(loan.interestRate), duration: Number(loan.duration), frequency: loan.repaymentFrequency || loan.frequency, purpose: loan.purpose, paid: 0, progress: 0, status: loan.status === 'ACTIVE' ? 'Repaying' : loan.status === 'PENDING' ? 'Pending' : loan.status === 'APPROVED' ? 'Approved' : loan.status, due: 'Scheduled', appliedAt: loan.appliedAt?.slice(0, 10), approvedAt: loan.decision?.decidedAt?.slice(0, 10), schedule: [],
})

export default function LoanManagementPage() {
  const dispatch = useDispatch()
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
  // Loan applications must use the same shared customer directory as the
  // customer screen, never a browser-only or mock list.
  useEffect(() => { dispatch(loadCustomers()) }, [dispatch])
  useEffect(() => {
    let active = true
    getBackendLoans().then((backendLoans) => {
      if (!active || !backendLoans.length) return
      setLoans(backendLoans.map(frontendLoan))
    }).catch(() => {})
    return () => { active = false }
  }, [])
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(timer) }, [notice])
  const shown = useMemo(() => loans.filter((loan) => loan.customer.toLowerCase().includes(search.toLowerCase()) && (status === 'All Status' || (status === 'Overdue' ? loan.status.includes('Overdue') : loan.status === status))), [loans, search, status])
  const update = (id, changes) => setLoans((items) => items.map((loan) => loan.id === id ? { ...loan, ...changes } : loan))
  const create = async (form) => { try { const backendLoan = await createBackendLoan({ customerId: form.customerId, amount: Number(form.amount), interestRate: Number(form.rate), duration: Number(form.duration), frequency: form.frequency, purpose: form.purpose }); const loan = { ...frontendLoan(backendLoan), customer: form.customer, initials: form.initials, business: form.business, loanType: form.loanType || 'individual', chamaName: form.chamaName, chamaMemberCount: form.chamaMemberCount, schedule: generateSchedule({ amount: form.amount, interestRate: form.rate, duration: form.duration, frequency: form.frequency }) }; setLoans((items) => [loan, ...items]); setView('pending'); setNotice({ type: 'success', message: `${form.customer} application submitted for review.` }) } catch (requestError) { setNotice({ type: 'error', message: requestError.response?.data?.error || 'Could not submit the loan application.' }) } }
  const approve = (loan, conditions) => setConfirmation({ title: 'Approve loan application?', message: `${loan.id} will move to the disbursement queue.`, actionLabel: 'Approve loan', confirm: async () => { try { const approved = await approveBackendLoan(loan, conditions); update(loan.id, { ...frontendLoan(approved), customer: loan.customer, business: loan.business }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan request approved', message: `Your request for KES ${loan.amount.toLocaleString()} has been approved and is awaiting disbursement.` }); setNotice({ type: 'success', message: `${loan.id} approved and the customer notified.` }) } catch (requestError) { setNotice({ type: 'error', message: requestError.response?.data?.error || 'Could not approve the loan.' }) } } })
  const reject = (loan, reason, notes) => { update(loan.id, { status: 'Rejected', rejectedAt: new Date().toISOString().slice(0, 10), rejectionReason: reason, rejectionNotes: notes }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan request update', message: `Your request for KES ${loan.amount.toLocaleString()} was not approved. Reason: ${reason}.` }); setNotice({ type: 'success', message: `${loan.id} was rejected and the customer notified.` }) }
  const disburse = (loan, details) => setConfirmation({ title: 'Confirm disbursement?', message: `Record a KES ${loan.amount.toLocaleString()} ${details.method} disbursement for ${loan.customer}.`, actionLabel: 'Record disbursement', confirm: async () => { try { const disbursed = await disburseBackendLoan(loan, details); update(loan.id, { ...frontendLoan(disbursed), customer: loan.customer, business: loan.business, disbursedAt: details.date, disbursement: details, schedule: loan.schedule }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Loan disbursed', message: `KES ${loan.amount.toLocaleString()} has been disbursed via ${details.method}. Your next repayment is ${loan.schedule?.[0]?.dueDate || 'scheduled'}.` }); setNotice({ type: 'success', message: `${loan.id} disbursed via ${details.method} and the customer notified.` }) } catch (requestError) { setNotice({ type: 'error', message: requestError.response?.data?.error || 'Could not disburse the loan.' }) } } })
  const saveSchedule = (loan, schedule) => { update(loan.id, { schedule, due: schedule.find((item) => item.status !== 'Paid')?.dueDate || 'Completed' }); setNotice({ type: 'success', message: `${loan.id} repayment schedule updated.` }) }
  const recordRepayment = (loan, payment) => {
    const result = applyRepayment(loan, payment)
    if (!result) return setNotice({ type: 'error', message: 'This loan has no outstanding repayment balance.' })
    update(loan.id, result.changes)
    createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Repayment received', message: `We received your KES ${result.applied.toLocaleString()} repayment via ${payment.method}.` })
    setNotice({ type: 'success', message: `KES ${result.applied.toLocaleString()} repayment recorded and the customer notified.` })
  }
  const sendReminder = (loan, reminder) => { update(loan.id, { reminders: [...(loan.reminders || []), { ...reminder, sentAt: new Date().toISOString() }] }); createCustomerNotification({ customerId: loan.customerId, loanId: loan.id, title: 'Repayment reminder', message: reminder.note || `Please make your scheduled repayment for loan ${loan.id}.` }); setNotice({ type: 'success', message: `Automated ${reminder.channel} reminder queued for ${loan.customer}.` }) }
  const selected = loans.find((loan) => loan.id === selectedId)
  const tabs = [['portfolio', 'Portfolio'], ['pending', `Pending (${loans.filter((loan) => loan.status === 'Pending').length})`], ['disburse', 'Disbursements']]
  return <AppShell title="Loan Management" subtitle="Applications, approvals, disbursements and repayment schedules."><LoanAlert notice={notice} onClose={() => setNotice(null)} /><div className="flex flex-wrap gap-2 border-b border-[#e9ebe5]">{tabs.map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`border-b-2 px-3 py-3 text-sm font-bold ${view === key ? 'border-[#397d09] text-[#397d09]' : 'border-transparent text-[#5c635a]'}`}>{label}</button>)}</div>{view === 'portfolio' && <section className="mt-6 grid grid-cols-1 gap-[27px] lg:grid-cols-[340px_1fr]"><NewLoanForm key={`${requestedCustomerId}-${requestedChama}`} onCreate={create} customers={customers} initialCustomerId={requestedCustomerId} chamaName={requestedChama} chamaMemberCount={requestedMemberCount} isGroupLoan={isGroupLoan} /><section className="min-w-0"><div className="mb-4 flex flex-col items-start gap-3.5 md:flex-row md:items-center md:justify-between"><h2 className="m-0 text-2xl font-bold">Loan portfolio</h2><div className="flex w-full gap-3 md:w-auto"><label className="flex h-11 flex-1 items-center rounded-lg border border-[#bdc8b6] px-3 text-lg">⌕<input className="w-full border-0 pl-2 text-base outline-none md:w-[200px]" placeholder="Search customer..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="h-11 rounded-lg border border-[#bdc8b6] bg-white px-3 text-base" value={status} onChange={(event) => setStatus(event.target.value)}><option>All Status</option><option>Repaying</option><option>Overdue</option><option>Due Tomorrow</option><option>Pending</option><option>Approved</option></select></div></div><LoanTable loans={shown} onSelect={(loan) => setSelectedId(loan.id)} /></section></section>}{view === 'pending' && <section className="mt-6 max-w-3xl"><h2>Application review queue</h2><PendingQueue loans={loans} role={role} onApprove={approve} onReject={reject} /></section>}{view === 'disburse' && <section className="mt-6 max-w-3xl"><h2>Approved, awaiting disbursement</h2><DisbursementQueue loans={loans} onDisburse={disburse} /></section>}{selected && <LoanDetail key={`${selected.id}-${selected.paid}-${selected.reminders?.length || 0}-${selected.schedule?.[0]?.dueDate || ''}`} loan={selected} onClose={() => setSelectedId(null)} onSaveSchedule={saveSchedule} onRecordRepayment={recordRepayment} onSendReminder={sendReminder} />}<ConfirmationModal confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={() => { confirmation.confirm(); setConfirmation(null) }} /></AppShell>
}

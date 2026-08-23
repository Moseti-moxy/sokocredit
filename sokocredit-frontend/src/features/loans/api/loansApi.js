export const customers = [
  { id: 'C-1001', name: 'Mary Wanjiku', business: 'Fruit Vendor', phone: '0712 345 678' },
  { id: 'C-1002', name: 'John Ochieng', business: 'Hardware Stall', phone: '0722 456 789' },
  { id: 'C-1003', name: 'Sarah Amina', business: 'Textiles', phone: '0733 567 890' },
]

export const loans = [
  { id: 'L-4921', customer: 'Jane Doe', customerId: 'SC-2023-894', initials: 'JD', business: 'Fresh Produce Vendor', amount: 20000, interestRate: 10, duration: 4, frequency: 'monthly', paid: 15000, progress: 75, status: 'Repaying', due: 'Oct 15, 2026', appliedAt: '2026-06-01', approvedAt: '2026-06-02', disbursedAt: '2026-06-03', schedule: [] },
  { id: 'L-4811', customer: 'Samuel Ochieng', customerId: 'SC-2023-742', initials: 'SO', business: 'Hardware Supplies', amount: 50000, interestRate: 12, duration: 6, frequency: 'monthly', paid: 15000, progress: 30, status: 'Overdue 14 Days', due: 'Sep 15, 2026', appliedAt: '2026-03-01', approvedAt: '2026-03-02', disbursedAt: '2026-03-03', schedule: [] },
  { id: 'L-5012', customer: 'Mary Njoroge', customerId: 'SC-2022-105', initials: 'MN', business: 'Textiles & Fabrics', amount: 10000, interestRate: 8, duration: 3, frequency: 'monthly', paid: 1000, progress: 10, status: 'Due Tomorrow', due: 'Aug 21, 2026', appliedAt: '2026-07-01', approvedAt: '2026-07-02', disbursedAt: '2026-07-03', schedule: [] },
  { id: 'L-5120', customer: 'Jane Doe', customerId: 'SC-2023-894', initials: 'JD', business: 'Fresh Produce Vendor', amount: 30000, interestRate: 10, duration: 6, frequency: 'monthly', paid: 0, progress: 0, status: 'Pending', due: 'Awaiting approval', appliedAt: '2026-08-18', schedule: [] },
]

export const money = (value) => new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(Number(value) || 0)

export function getInstallmentCount(durationMonths, frequency) {
  const months = Number(durationMonths)
  if (!Number.isFinite(months) || months <= 0) return 0
  return months * ({ daily: 30, weekly: 4, monthly: 1 }[frequency] || 1)
}

export function calculateRepayment(amount, interestRate, durationMonths, frequency) {
  const principal = Number(amount)
  const rate = Number(interestRate)
  const installments = getInstallmentCount(durationMonths, frequency)
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(rate) || rate < 0 || !installments) return { interest: 0, total: 0, installment: 0, installments: 0 }
  const interest = principal * (rate / 100)
  const total = principal + interest
  return { interest, total, installment: Math.round((total / installments) * 100) / 100, installments }
}

export function generateSchedule({ amount, interestRate, duration, frequency, startDate = new Date() }) {
  const repayment = calculateRepayment(amount, interestRate, duration, frequency)
  const start = new Date(startDate)
  const dayStep = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30
  return Array.from({ length: repayment.installments }, (_, index) => {
    const dueDate = new Date(start)
    dueDate.setDate(dueDate.getDate() + dayStep * (index + 1))
    const finalAmount = index === repayment.installments - 1 ? Math.round((repayment.total - repayment.installment * index) * 100) / 100 : repayment.installment
    return { number: index + 1, dueDate: dueDate.toISOString().slice(0, 10), amount: finalAmount, status: 'Unpaid' }
  })
}

// Applies a payment to a loan's schedule (earliest unpaid installment first)
// and returns the state changes to merge into the loan record. Returns null
// if the loan has no outstanding balance to apply the payment to. Shared by
// the loan officer's "Record repayment" workflow and the customer portal's
// self-service "Make a payment" flow so both stay in sync.
export function applyRepayment(loan, payment) {
  const schedule = loan.schedule?.length ? loan.schedule : generateSchedule(loan)
  let remaining = Number(payment.amount)
  let applied = 0
  const updatedSchedule = schedule.map((item) => {
    if (remaining <= 0 || item.status === 'Paid') return item
    const outstanding = Math.max(0, Number(item.amount) - Number(item.paidAmount || 0))
    const allocation = Math.min(outstanding, remaining)
    remaining -= allocation
    applied += allocation
    const paidAmount = Number(item.paidAmount || 0) + allocation
    return { ...item, paidAmount, status: paidAmount >= Number(item.amount) ? 'Paid' : 'Partially Paid' }
  })
  if (!applied) return null
  const paid = Number(loan.paid || 0) + applied
  const total = schedule.reduce((sum, item) => sum + Number(item.amount), 0)
  const complete = paid >= total - 0.01
  const repayment = { id: `RP-${Date.now().toString().slice(-6)}`, ...payment, amount: applied, date: payment.date || new Date().toISOString().slice(0, 10) }
  const changes = {
    paid,
    progress: Math.min(100, Math.round((paid / total) * 100)),
    schedule: updatedSchedule,
    repayments: [...(loan.repayments || []), repayment],
    status: complete ? 'Closed' : 'Repaying',
    due: complete ? 'Completed' : updatedSchedule.find((item) => item.status !== 'Paid')?.dueDate,
  }
  return { changes, applied, repayment }
}

// Breaks a loan's flat-rate simple interest down into a principal/interest
// split per installment, so the customer portal can chart how much of what
// they still owe (and have already paid) is interest versus principal.
export function getInterestBreakdown(loan) {
  const schedule = loan.schedule?.length ? loan.schedule : generateSchedule(loan)
  const principal = Number(loan.amount) || 0
  const interestTotal = principal * ((Number(loan.interestRate) || 0) / 100)
  const total = schedule.reduce((sum, item) => sum + Number(item.amount), 0) || (principal + interestTotal)
  const interestShare = total ? interestTotal / total : 0
  let cumulativeInterest = 0
  let cumulativePrincipal = 0
  let interestPaid = 0
  const series = schedule.map((item) => {
    const amount = Number(item.amount) || 0
    const paidAmount = Number(item.paidAmount ?? (item.status === 'Paid' ? amount : 0))
    cumulativeInterest += amount * interestShare
    cumulativePrincipal += amount * (1 - interestShare)
    interestPaid += paidAmount * interestShare
    return {
      number: item.number,
      dueDate: item.dueDate,
      cumulativeInterest: Math.round(cumulativeInterest),
      cumulativePrincipal: Math.round(cumulativePrincipal),
    }
  })
  return {
    principal,
    interestTotal: Math.round(interestTotal),
    total: Math.round(total),
    interestPaid: Math.round(Math.min(interestTotal, interestPaid)),
    interestRemaining: Math.round(Math.max(0, interestTotal - interestPaid)),
    series,
  }
}

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

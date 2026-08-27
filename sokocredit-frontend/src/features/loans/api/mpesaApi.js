import { apiClient } from '../../../api/client'

export async function sendStkPush(loanId, { amount, phoneNumber }) {
  const { data } = await apiClient.post(`/loans/${encodeURIComponent(loanId)}/mpesa/stk-push`, {
    amount: Number(amount),
    phoneNumber,
  })
  return data
}

export async function getBackendLoans() {
  const { data } = await apiClient.get('/loans')
  return data.loans || []
}

export async function createBackendLoan(values) {
  const { data } = await apiClient.post('/loans', { ...values, repaymentFrequency: values.frequency, durationUnit: 'months' })
  return data.loan
}

export async function approveBackendLoan(loan, conditions) {
  const { data } = await apiClient.post(`/loans/${encodeURIComponent(loan.id)}/approve`, {
    amount: loan.amount, interestRate: loan.interestRate, duration: loan.duration,
    repaymentFrequency: loan.frequency, durationUnit: 'months', conditions: conditions ? [conditions] : [],
  })
  return data.loan
}

export async function disburseBackendLoan(loan, details) {
  const { data } = await apiClient.post(`/loans/${encodeURIComponent(loan.id)}/disburse`, {
    amount: loan.amount, method: details.method, reference: details.reference,
    disbursedAt: `${details.date}T00:00:00+03:00`,
  })
  return data.loan
}

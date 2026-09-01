import { apiClient } from '../../../api/client';

const STATUS_LABELS = { PENDING: 'Pending', APPROVED: 'Approved', ACTIVE: 'Repaying', COMPLETED: 'Closed', REJECTED: 'Rejected' };
const SCHEDULE_STATUS_LABELS = { PENDING: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid' };

export async function listOwnLoans() {
  const { data } = await apiClient.get('/customer/loans');
  return data.loans || [];
}

export async function applyForLoan(payload) {
  const { data } = await apiClient.post('/customer/loans', payload);
  return data.loan;
}

export async function getRepaymentSchedule(loanId) {
  const { data } = await apiClient.get(`/customer/loans/${loanId}/repayment-schedule`);
  return data;
}

export async function payViaMpesa(loanId, { amount, phoneNumber }) {
  const { data } = await apiClient.post(`/customer/loans/${loanId}/mpesa/stk-push`, { amount, phoneNumber });
  return data;
}

export async function createStripeIntent(loanId, { amount, currency = 'usd' }) {
  const { data } = await apiClient.post(`/customer/loans/${loanId}/stripe/payment-intent`, { amount, currency });
  return data;
}

export async function requestRenewal(loanId, payload) {
  const { data } = await apiClient.post(`/customer/loans/${loanId}/renew`, payload);
  return data.loan;
}

/** Maps the backend's Loan + repayment-schedule shape onto the fields this
 * dashboard's UI was already built around (status labels, paid/progress,
 * schedule item shape), so the JSX itself doesn't need to change. */
export function normalizeLoan(loan, { repaymentSchedule = [], outstandingBalance = 0 } = {}, allLoans = []) {
  const paid = repaymentSchedule.reduce((total, item) => total + Number(item.amountPaid || 0), 0);
  const rejection = loan.decision?.type === 'REJECTED' ? loan.decision.reason : null;
  const renewalRequested = allLoans.some((other) => other.renewalOf === loan.id);
  return {
    id: loan.id,
    customerId: loan.customerId,
    amount: loan.amount,
    interestRate: loan.interestRate,
    duration: loan.duration,
    frequency: loan.repaymentFrequency,
    purpose: loan.purpose,
    loanType: 'individual',
    chamaName: '',
    chamaMemberCount: 0,
    paid,
    outstanding: outstandingBalance,
    progress: loan.amount ? Math.min(100, Math.round((paid / loan.amount) * 100)) : 0,
    status: STATUS_LABELS[loan.status] || loan.status,
    appliedAt: (loan.appliedAt || '').slice(0, 10),
    rejectionReason: rejection,
    renewalOf: loan.renewalOf,
    renewalRequested,
    schedule: repaymentSchedule.map((item) => ({
      number: item.installment,
      dueDate: item.dueDate,
      amount: item.amountDue,
      paidAmount: item.amountPaid,
      status: SCHEDULE_STATUS_LABELS[item.status] || item.status,
    })),
  };
}

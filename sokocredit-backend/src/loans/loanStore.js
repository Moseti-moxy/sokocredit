import { randomUUID } from 'node:crypto';

const loans = new Map();

export const LoanStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DISBURSED: 'DISBURSED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
});

export function createLoan(input) {
  const now = new Date().toISOString();
  const loan = {
    id: randomUUID(),
    customerId: input.customerId,
    amount: Number(input.amount),
    interestRate: Number(input.interestRate),
    duration: Number(input.duration),
    durationUnit: input.durationUnit ?? 'months',
    repaymentFrequency: input.repaymentFrequency ?? 'monthly',
    purpose: input.purpose ?? null,
    status: LoanStatus.PENDING,
    appliedAt: now,
    decision: null,
    disbursements: [],
    repaymentSchedule: [],
    repayments: [],
    renewalOf: input.renewalOf ?? null,
    createdAt: now,
    updatedAt: now,
  };
  loans.set(loan.id, loan);
  return loan;
}

export function getLoan(id) {
  return loans.get(id) ?? null;
}

export function listLoans(customerId) {
  return [...loans.values()].filter((loan) => !customerId || loan.customerId === customerId);
}

export function updateLoan(loan, values) {
  Object.assign(loan, values, { updatedAt: new Date().toISOString() });
  return loan;
}

export function clearLoans() {
  loans.clear();
}

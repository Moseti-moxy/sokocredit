// Mock payment API methods & data contracts
export const initialPayments = [
  {
    id: 'pay-101',
    loanId: 'loan-001',
    customerId: 'cust-001',
    amount: 5000,
    paymentMethod: 'M-Pesa',
    date: '2026-08-15',
    isPartial: false,
    remainingBalance: 0,
    reference: 'MPESA987654'
  }
];

export const initialRiskAlerts = [
  {
    id: 'alert-1',
    customerId: 'cust-002',
    customerName: 'John Doe',
    missedPayments: 3,
    daysOverdue: 14,
    riskLevel: 'HIGH', // LOW, MEDIUM, HIGH
    creditScore: 580
  }
];
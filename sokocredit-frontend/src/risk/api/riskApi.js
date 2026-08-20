// Initial mock dataset for risk alerts and credit scores
export const initialRiskAlerts = [
  {
    id: 'alert-101',
    customerId: 'cust-002',
    customerName: 'John Doe',
    missedPayments: 3,
    daysOverdue: 21,
    riskLevel: 'HIGH',
    creditScore: 540,
    flaggedDate: '2026-08-10'
  },
  {
    id: 'alert-102',
    customerId: 'cust-005',
    customerName: 'Mary Wanjiku',
    missedPayments: 2,
    daysOverdue: 12,
    riskLevel: 'MEDIUM',
    creditScore: 620,
    flaggedDate: '2026-08-15'
  },
  {
    id: 'alert-103',
    customerId: 'cust-009',
    customerName: 'Samuel Ochieng',
    missedPayments: 4,
    daysOverdue: 35,
    riskLevel: 'HIGH',
    creditScore: 490,
    flaggedDate: '2026-08-01'
  }
];

// Async API wrapper functions to simulate backend endpoints
export const fetchRiskAlerts = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...initialRiskAlerts]);
    }, 500);
  });
};

export const fetchCustomerCreditScore = async (customerId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock lookup return
      resolve({
        customerId,
        creditScore: Math.floor(Math.random() * (850 - 300 + 1)) + 300,
        lastUpdated: new Date().toISOString()
      });
    }, 300);
  });
};
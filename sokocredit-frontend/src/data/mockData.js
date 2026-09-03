// Placeholder data so the frontend team can build screens ahead of the
// Flask API being ready. Shapes here should mirror what the backend
// team agrees on for the real endpoints (see comments per section).

export const currentAgent = {
  id: 'AGT-8492',
  name: 'Agent',
  market: 'Kiseka Market',
};

export const dashboardStats = {
  totalPortfolio: 1250000,
  portfolioChangePct: 4.2,
  activeLoans: 142,
  marketsCovered: 5,
  todaysTarget: 45000,
  collectedToday: 29250,
};

// Last 8 weeks of portfolio value vs. amount collected, for the Dashboard
// trend chart. Mirrors the shape of `monthlyFlow` below but at a shorter,
// week-by-week grain since this chart lives on the daily-use home screen.
export const portfolioTrend = [
  { week: 'Wk 1', portfolio: 1080000, collected: 210000 },
  { week: 'Wk 2', portfolio: 1105000, collected: 232000 },
  { week: 'Wk 3', portfolio: 1132000, collected: 198000 },
  { week: 'Wk 4', portfolio: 1160000, collected: 251000 },
  { week: 'Wk 5', portfolio: 1188000, collected: 240000 },
  { week: 'Wk 6', portfolio: 1206000, collected: 264000 },
  { week: 'Wk 7', portfolio: 1224000, collected: 258000 },
  { week: 'Wk 8', portfolio: 1250000, collected: 271000 },
];

export const recentActivity = [
  { id: 1, customer: 'Jane Mutua', businessType: 'Produce Stall', type: 'repayment', amount: 1500, time: '10:42 AM', status: 'Completed' },
  { id: 2, customer: 'Peter Ochieng', businessType: 'Hardware', type: 'disbursement', amount: -50000, time: '09:15 AM', status: 'Pending' },
  { id: 3, customer: 'Mary Wanjiku', businessType: 'Textiles', type: 'repayment', amount: 800, time: 'Yesterday', status: 'Completed' },
];

export const customers = [
  {
    id: 'SC-2023-894',
    name: 'Jane Doe',
    business: 'Fresh Produce Vendor',
    market: 'Gikomba Market',
    location: 'Stall #42, Gikomba Market, Pumwani Rd, Nairobi',
    latitude: -1.280095,
    longitude: 36.816351,
    status: 'Active',
    joined: 'Mar 12, 2021',
    totalLoans: 14,
    defaultRate: 0,
    creditScore: 85,
    lastRepayment: 'Today',
    chama: 'Gikomba Market Chama',
    chamaRole: 'chairperson',
    paymentHistory: [
      { id: 1, type: 'Repayment - Daily Installment', method: 'M-Pesa', date: 'Today, 09:45 AM', amount: 500, balanceAfter: 4500, direction: 'in' },
      { id: 2, type: 'Repayment - Daily Installment', method: 'Cash (Agent)', date: 'Yesterday, 14:20 PM', amount: 500, balanceAfter: 5000, direction: 'in' },
      { id: 3, type: 'Loan Disbursement - 14 Day Stock', method: 'Bank Transfer', date: 'Oct 24, 2023', amount: 10000, balanceAfter: null, direction: 'out' },
    ],
  },
  {
    id: 'SC-2023-742',
    name: 'Samuel Ochieng',
    business: 'Hardware Supplies',
    market: 'Muthurwa Market',
    location: 'Muthurwa Market, Nairobi',
    latitude: -1.287257,
    longitude: 36.821946,
    status: 'Active',
    joined: 'Jun 2, 2022',
    totalLoans: 6,
    defaultRate: 0,
    creditScore: 72,
    lastRepayment: 'Yesterday',
    chama: 'Muthurwa Women Traders Group',
    chamaRole: 'chairperson',
    paymentHistory: [],
  },
  {
    id: 'SC-2022-105',
    name: 'Mary Njoroge',
    business: 'Textiles & Fabrics',
    market: 'City Park Market',
    location: 'City Park Market, Nairobi',
    latitude: -1.283333,
    longitude: 36.816667,
    status: 'Overdue',
    joined: 'Jan 18, 2022',
    totalLoans: 9,
    defaultRate: 11,
    creditScore: 54,
    lastRepayment: '5 days ago',
    chama: 'No Chama / Individual Borrower',
    paymentHistory: [],
  },
];

export const loans = [
  { id: 'L-4921', customer: 'Mary Wanjiku', business: 'Fruit Vendor', amount: 20000, paid: 15000, progressPct: 75, status: 'On Track', dueDate: 'Oct 15, 2023' },
  { id: 'L-4811', customer: 'John Ochieng', business: 'Hardware Stall', amount: 50000, paid: 15000, progressPct: 30, status: 'Overdue 14 Days', dueDate: 'Sep 15, 2023' },
  { id: 'L-5012', customer: 'Sarah Amina', business: 'Textiles', amount: 10000, paid: 1000, progressPct: 10, status: 'Due Tomorrow', dueDate: 'Oct 02, 2023' },
];

export const analyticsSummary = {
  totalDisbursed: 4200000,
  disbursedChangePct: 12,
  totalCollected: 3800000,
  collectedChangePct: 8,
  activeLoans: 142,
  activeLoanMarkets: 5,
  parOver30: 4.1,
};

export const monthlyFlow = [
  { month: 'Jan', collected: 420000, disbursed: 380000 },
  { month: 'Feb', collected: 510000, disbursed: 460000 },
  { month: 'Mar', collected: 560000, disbursed: 520000 },
  { month: 'Apr', collected: 640000, disbursed: 600000 },
  { month: 'May', collected: 780000, disbursed: 700000 },
  { month: 'Jun', collected: 900000, disbursed: 820000 },
];

export const performanceByCategory = [
  { name: 'Produce', value: 38, color: '#3f7d2e' },
  { name: 'Hardware', value: 27, color: '#67a852' },
  { name: 'Clothing', value: 21, color: '#8fc17e' },
  { name: 'Services', value: 14, color: '#dcecd6' },
];

export const defaultersAlert = [
  { id: 1, name: 'Mama Njeri', business: 'Produce', amount: 4500, daysOverdue: 14 },
  { id: 2, name: 'Karanja', business: 'Hardware', amount: 12000, daysOverdue: 7 },
];

export const fieldAgents = [
  { id: 'AGT-001', name: 'David Ochieng', market: 'Nairobi CBD', collectionsMtd: 450000, changePct: 12, rating: 4 },
  { id: 'AGT-004', name: 'Mercy Wanjiku', market: 'Thika Town', collectionsMtd: 320000, changePct: 0, rating: 4, note: 'On target' },
];

export const loanParameterDefaults = {
  standardInterestRate: 12.5,
  maxLoanTermDays: 60,
};

export const integrationStatus = [
  { id: 'mpesa', label: 'M-Pesa B2C', status: 'Active' },
  { id: 'sms', label: 'Africa\'s Talking', status: 'Active' },
];

export const creditScoreDistribution = [
  { band: '0-40', count: 12 },
  { band: '41-60', count: 34 },
  { band: '61-80', count: 58 },
  { band: '81-100', count: 38 },
];

export const delinquencyTrends = [
  { label: '30 Days Late', pct: 12.4 },
  { label: '60 Days Late', pct: 5.2 },
  { label: '90+ Days Late', pct: 2.1 },
];

export const highRiskAccounts = [
  { id: 'TRD-8821', factor: 'Business Instability', exposure: 450000 },
  { id: 'TRD-9014', factor: '60 Days Late', exposure: 120000 },
  { id: 'TRD-7654', factor: 'Missed repayment history', exposure: 85000 },
];

// --- Reports & Payment Pattern data (Dev 4 cards) ---------------------

export const reportFilterOptions = {
  loanOfficers: ['All Officers', 'David Ochieng', 'Mercy Wanjiku', 'Jane Smith'],
  locations: ['All Markets', 'Gikomba Market', 'Muthurwa Market', 'City Park Market', 'Kiseka Market'],
};

// Default rate by market, filterable by the report filters above.
export const defaultRateByMarket = [
  { location: 'Gikomba Market', officer: 'Jane Smith', loans: 58, defaultRate: 3.2, atRiskAmount: 145000 },
  { location: 'Muthurwa Market', officer: 'David Ochieng', loans: 41, defaultRate: 5.8, atRiskAmount: 210000 },
  { location: 'City Park Market', officer: 'Mercy Wanjiku', loans: 33, defaultRate: 8.1, atRiskAmount: 187000 },
  { location: 'Kiseka Market', officer: 'David Ochieng', loans: 27, defaultRate: 2.4, atRiskAmount: 62000 },
];

// On-time vs late repayment trend, week over week — feeds the Payment
// Pattern chart on the Payment Pattern / High-Risk Analysis card.
export const paymentPatternTrend = [
  { week: 'Wk 1', onTimePct: 88, latePct: 12 },
  { week: 'Wk 2', onTimePct: 85, latePct: 15 },
  { week: 'Wk 3', onTimePct: 90, latePct: 10 },
  { week: 'Wk 4', onTimePct: 84, latePct: 16 },
  { week: 'Wk 5', onTimePct: 87, latePct: 13 },
  { week: 'Wk 6', onTimePct: 91, latePct: 9 },
];

// Collection Targets Tracker — target vs achieved for each period.
export const collectionTargets = {
  daily: { label: 'Today', target: 45000, achieved: 29250 },
  weekly: { label: 'This Week', target: 260000, achieved: 198500 },
  monthly: { label: 'This Month', target: 1100000, achieved: 742000 },
};

export const auditLog = [
  { id: 1, timestamp: '2023-10-27 14:32:01', user: 'Jane Smith (Agent)', action: 'Loan Disbursed', status: 'Success', ip: '192.168.1.45' },
  { id: 2, timestamp: '2023-10-27 14:15:22', user: 'System Automated', action: 'Data Backup', status: 'Success', ip: 'Internal' },
  { id: 3, timestamp: '2023-10-27 13:45:10', user: 'Unknown Device', action: 'Failed Login Attempt', status: 'Failed', ip: '203.0.113.42' },
  { id: 4, timestamp: '2023-10-27 11:20:05', user: 'Jane Smith (Agent)', action: 'Customer Created', status: 'Success', ip: '192.168.1.45' },
];

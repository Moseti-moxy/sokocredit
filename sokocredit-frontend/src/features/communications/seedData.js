// Demo dataset for the role-based communication system.
//
// The seed deliberately wires every relationship the production system has:
//   Customer -> Support Case -> Assigned Agent -> Admin escalation
// so each dashboard shows realistic, connected content on first load.
// Data is replaced by real API responses once the Flask backend is live.

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours) => minutesAgo(hours * 60);
const daysAgo = (days) => hoursAgo(days * 24);

export const SEED_VERSION = 1;

// Known demo accounts (mirrors MOCK_USERS in src/data/mockAuth.js).
export const DEMO_CUSTOMERS = [
  {
    id: 'CUS-2024-001',
    name: 'Test Customer',
    nationalId: '12345678',
    phone: '+254 700 123 456',
    market: 'Wakulima Market (Marikiti)',
  },
  {
    id: 'CUS-2024-002',
    name: 'Market Trader',
    nationalId: '87654321',
    phone: '+254 700 987 654',
    market: 'Gikomba Market',
  },
];

export function buildSeedData() {
  const supportCases = [
    {
      id: 'CASE-1001',
      customerId: 'CUS-2024-001',
      customerName: 'Test Customer',
      nationalId: '12345678',
      phone: '+254 700 123 456',
      loanRef: 'LN-2024-014',
      category: 'Loan Issue',
      subject: 'Question about my repayment schedule',
      status: 'Resolved',
      priority: 'Normal',
      assignedAgentId: 'AGT-0001',
      assignedAgentName: 'Jane Wanjiru',
      escalatedAt: null,
      escalationReason: null,
      resolvedAt: daysAgo(5),
      createdAt: daysAgo(6),
      updatedAt: daysAgo(5),
      messages: [
        { sender: 'customer', senderId: 'CUS-2024-001', senderName: 'Test Customer', text: 'Hi, I received KES 50,000 but I am not sure which date my first instalment is due.', at: daysAgo(6), internal: false },
        { sender: 'agent', senderId: 'AGT-0001', senderName: 'Jane Wanjiru', text: 'Hello! Your first instalment of KES 5,000 is due on the 30th. You can pay via Paybill 400200 using account LN-2024-014.', at: daysAgo(6) + 2 * 3_600_000 - 24 * 3_600_000, internal: false },
        { sender: 'customer', senderId: 'CUS-2024-001', senderName: 'Test Customer', text: 'Thank you, that is clear.', at: daysAgo(5), internal: false },
      ],
    },
    {
      id: 'CASE-1002',
      customerId: 'CUS-2024-002',
      customerName: 'Market Trader',
      nationalId: '87654321',
      phone: '+254 700 987 654',
      loanRef: 'LN-2024-021',
      category: 'Payment Issue',
      subject: 'M-Pesa payment not reflecting',
      status: 'Open',
      priority: 'High',
      assignedAgentId: 'AGT-0001',
      assignedAgentName: 'Jane Wanjiru',
      escalatedAt: null,
      escalationReason: null,
      resolvedAt: null,
      createdAt: hoursAgo(26),
      updatedAt: hoursAgo(20),
      messages: [
        { sender: 'customer', senderId: 'CUS-2024-002', senderName: 'Market Trader', text: 'I paid KES 3,500 this morning via M-Pesa but my loan balance still shows unpaid.', at: hoursAgo(26), internal: false },
        { sender: 'agent', senderId: 'AGT-0001', senderName: 'Jane Wanjiru', text: 'Sorry about that. Could you share the M-Pesa confirmation code so I can trace the payment?', at: hoursAgo(20), internal: false },
      ],
    },
    {
      id: 'CASE-1003',
      customerId: 'CUS-2024-001',
      customerName: 'Test Customer',
      nationalId: '12345678',
      phone: '+254 700 123 456',
      loanRef: null,
      category: 'Account Issue',
      subject: 'Update my phone number',
      status: 'In Progress',
      priority: 'Normal',
      assignedAgentId: 'AGT-0001',
      assignedAgentName: 'Jane Wanjiru',
      escalatedAt: null,
      escalationReason: null,
      resolvedAt: null,
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(22),
      messages: [
        { sender: 'customer', senderId: 'CUS-2024-001', senderName: 'Test Customer', text: 'I lost my old SIM. I need to update my phone number to +254 711 222 333.', at: daysAgo(2), internal: false },
        { sender: 'agent', senderId: 'AGT-0001', senderName: 'Jane Wanjiru', text: 'Sure, I can help with that. For security, please confirm the National ID registered on your account.', at: daysAgo(1), internal: false },
        { sender: 'customer', senderId: 'CUS-2024-001', senderName: 'Test Customer', text: 'My ID is 12345678.', at: hoursAgo(22), internal: false },
      ],
    },
    {
      id: 'CASE-1004',
      customerId: 'CUS-2024-002',
      customerName: 'Market Trader',
      nationalId: '87654321',
      phone: '+254 700 987 654',
      loanRef: 'LN-2024-021',
      category: 'Loan Dispute',
      subject: 'Disagreement with repayment start date',
      status: 'Escalated',
      priority: 'Urgent',
      assignedAgentId: 'AGT-0002',
      assignedAgentName: 'David Kipchoge',
      escalatedAt: daysAgo(2),
      escalationReason: 'Customer disputes the agreed repayment dates; needs supervisor review of the loan agreement.',
      resolvedAt: null,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
      messages: [
        { sender: 'customer', senderId: 'CUS-2024-002', senderName: 'Market Trader', text: 'The agent told me repayments start next month, but the SMS says this week. Which one is correct?', at: daysAgo(3), internal: false },
        { sender: 'agent', senderId: 'AGT-0002', senderName: 'David Kipchoge', text: 'Let me check your agreement records and get back to you shortly.', at: daysAgo(2), internal: false },
        { sender: 'agent', senderId: 'AGT-0002', senderName: 'David Kipchoge', text: 'Customer was verbally promised a different start date during onboarding. Flagging for supervisor review before responding further.', at: daysAgo(2), internal: true },
        { sender: 'admin', senderId: 'ADM-0001', senderName: 'David Otieno', text: 'This is David from management. We are reviewing your agreement and will confirm the correct repayment date within 24 hours.', at: daysAgo(1), internal: false },
      ],
    },
    {
      id: 'CASE-1005',
      customerId: 'CUS-2024-001',
      customerName: 'Test Customer',
      nationalId: '12345678',
      phone: '+254 700 123 456',
      loanRef: null,
      category: 'Other',
      subject: 'How do I download my loan statement?',
      status: 'Open',
      priority: 'Low',
      assignedAgentId: null,
      assignedAgentName: null,
      escalatedAt: null,
      escalationReason: null,
      resolvedAt: null,
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
      messages: [
        { sender: 'customer', senderId: 'CUS-2024-001', senderName: 'Test Customer', text: 'Can I download a PDF statement of my payments? My chama treasurer needs it for our records.', at: hoursAgo(5), internal: false },
      ],
    },
  ];

  const notifications = [
    // Test Customer — automated account notifications only they can see.
    { id: 'NTF-1001', channel: 'customer', userId: 'CUS-2024-001', type: 'application_received', title: 'Loan Application Received', body: 'We have received your loan application for KES 50,000. Our team will review it and contact you within 24 hours.', refId: 'LN-2024-014', deliveryChannel: 'WhatsApp', read: true, createdAt: daysAgo(6) },
    { id: 'NTF-1002', channel: 'customer', userId: 'CUS-2024-001', type: 'loan_approved', title: 'Loan Approved', body: 'Congratulations! Your loan application for KES 50,000 has been approved.', refId: 'LN-2024-014', deliveryChannel: 'SMS', read: true, createdAt: daysAgo(5) },
    { id: 'NTF-1003', channel: 'customer', userId: 'CUS-2024-001', type: 'loan_disbursed', title: 'Funds Disbursed', body: 'Your loan of KES 50,000 has been disbursed to M-Pesa ending in 456.', refId: 'LN-2024-014', deliveryChannel: 'WhatsApp', read: true, createdAt: daysAgo(5) },
    { id: 'NTF-1004', channel: 'customer', userId: 'CUS-2024-001', type: 'payment_reminder', title: 'Payment Due Tomorrow', body: 'A payment of KES 5,000 for LN-2024-014 is due tomorrow. Pay via Paybill 400200 to avoid penalties.', refId: 'LN-2024-014', deliveryChannel: 'SMS', read: false, createdAt: daysAgo(1) },
    { id: 'NTF-1005', channel: 'customer', userId: 'CUS-2024-001', type: 'overdue_notice', title: 'Payment Overdue', body: 'Your instalment of KES 5,000 was due yesterday. Please settle it today to keep your credit record clean.', refId: 'LN-2024-014', deliveryChannel: 'WhatsApp', read: false, createdAt: hoursAgo(3) },
    // Market Trader — separate inbox, never mixed with staff communication.
    { id: 'NTF-1006', channel: 'customer', userId: 'CUS-2024-002', type: 'application_received', title: 'Loan Application Received', body: 'We have received your loan application for KES 30,000. Review is in progress.', refId: 'LN-2024-021', deliveryChannel: 'SMS', read: true, createdAt: daysAgo(8) },
    { id: 'NTF-1007', channel: 'customer', userId: 'CUS-2024-002', type: 'loan_approved', title: 'Loan Approved', body: 'Good news! Your loan application for KES 30,000 has been approved.', refId: 'LN-2024-021', deliveryChannel: 'Email', read: true, createdAt: daysAgo(7) },
    { id: 'NTF-1008', channel: 'customer', userId: 'CUS-2024-002', type: 'payment_reminder', title: 'Payment Reminder', body: 'KES 3,500 for LN-2024-021 is due in two days. Reply PAID once you have transferred.', refId: 'LN-2024-021', deliveryChannel: 'WhatsApp', read: false, createdAt: daysAgo(2) },
    { id: 'NTF-1009', channel: 'customer', userId: 'CUS-2024-002', type: 'overdue_notice', title: 'Overdue Payment Notice', body: 'KES 3,500 remains unpaid past its due date. Settle today to avoid CRB listing.', refId: 'LN-2024-021', deliveryChannel: 'SMS', read: false, createdAt: daysAgo(1) },
    // Internal staff messages — land in the agent's Support Inbox panel,
    // completely separate from any customer notification feed.
    { id: 'NTF-1010', channel: 'staff', userId: 'AGT-0001', type: 'internal_message', title: 'Message from ADM-0001 David Otieno', body: 'Please prioritise CASE-1002 (M-Pesa payment not reflecting). The customer is waiting on a trace.', refId: 'CASE-1002', deliveryChannel: 'Internal', read: false, createdAt: hoursAgo(18) },
    { id: 'NTF-1011', channel: 'staff', userId: 'AGT-0002', type: 'internal_message', title: 'Escalation handover — CASE-1004', body: 'Management has picked up CASE-1004. Keep the thread updated with any new customer contact.', refId: 'CASE-1004', deliveryChannel: 'Internal', read: true, createdAt: daysAgo(2) },
  ];

  const announcements = [
    {
      id: 'ANN-1001',
      title: 'Scheduled system maintenance on Sunday',
      body: 'SokoCredit will undergo maintenance on Sunday from 10 PM to midnight. Payments made during this window may reflect late; no action is needed from you.',
      audience: 'all_customers',
      recipientIds: ['CUS-2024-001', 'CUS-2024-002'],
      sentById: 'ADM-0001',
      sentByName: 'David Otieno',
      createdAt: daysAgo(2),
    },
  ];

  const activityLog = [
    { id: 'ACT-1001', type: 'case_created', actorId: 'CUS-2024-001', actorName: 'Test Customer', caseId: 'CASE-1005', summary: 'New support case CASE-1005 created', details: 'Category: Other — "How do I download my loan statement?"', createdAt: hoursAgo(5) },
    { id: 'ACT-1002', type: 'reply', actorId: 'AGT-0001', actorName: 'Jane Wanjiru', caseId: 'CASE-1002', summary: 'Agent replied on CASE-1002', details: 'Requested M-Pesa confirmation code from customer.', createdAt: hoursAgo(20) },
    { id: 'ACT-1003', type: 'status_changed', actorId: 'AGT-0001', actorName: 'Jane Wanjiru', caseId: 'CASE-1003', summary: 'CASE-1003 moved to In Progress', details: 'Awaiting customer ID confirmation.', createdAt: daysAgo(1) },
    { id: 'ACT-1004', type: 'escalated', actorId: 'AGT-0002', actorName: 'David Kipchoge', caseId: 'CASE-1004', summary: 'CASE-1004 escalated to management', details: 'Customer disputes agreed repayment dates.', createdAt: daysAgo(2) },
    { id: 'ACT-1005', type: 'assigned', actorId: 'ADM-0001', actorName: 'David Otieno', caseId: 'CASE-1004', summary: 'CASE-1004 assigned to AGT-0002 David Kipchoge', details: 'Initial assignment after intake.', createdAt: daysAgo(2) },
    { id: 'ACT-1006', type: 'announcement', actorId: 'ADM-0001', actorName: 'David Otieno', caseId: null, summary: 'Announcement sent to 2 customers', details: 'ANN-1001 — Scheduled system maintenance on Sunday.', createdAt: daysAgo(2) },
    { id: 'ACT-1007', type: 'resolved', actorId: 'AGT-0001', actorName: 'Jane Wanjiru', caseId: 'CASE-1001', summary: 'CASE-1001 marked as Resolved', details: 'Customer confirmed repayment date question answered.', createdAt: daysAgo(5) },
    { id: 'ACT-1008', type: 'case_created', actorId: 'CUS-2024-001', actorName: 'Test Customer', caseId: 'CASE-1001', summary: 'New support case CASE-1001 created', details: 'Category: Loan Issue — "Question about my repayment schedule".', createdAt: daysAgo(6) },
  ];

  return {
    supportCases,
    notifications,
    announcements,
    activityLog,
    counters: { case: 1006, notification: 1012, announcement: 1002, activity: 1009 },
  };
}

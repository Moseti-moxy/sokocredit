// Shared vocabulary for the role-based communication system.
// Customer notifications, agent support cases, and admin oversight all
// speak the same language so a case moves cleanly between roles.

export const CASE_STATUSES = [
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Escalated',
];

// Statuses an agent is actively working (used for queue metrics).
export const ACTIVE_CASE_STATUSES = ['Open', 'In Progress', 'Waiting for Customer'];

export const CASE_CATEGORIES = [
  'Loan Issue',
  'Payment Issue',
  'Account Issue',
  'Loan Dispute',
  'Fraud Concern',
  'Other',
];

export const CASE_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

export const STATUS_BADGE_CLASSES = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'Waiting for Customer': 'bg-sky-100 text-sky-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Escalated: 'bg-violet-100 text-violet-700',
};

export const PRIORITY_DOT_CLASSES = {
  Low: 'bg-slate-400',
  Normal: 'bg-sky-500',
  High: 'bg-orange-500',
  Urgent: 'bg-red-600',
};

export const PRIORITY_TEXT_CLASSES = {
  Low: 'text-slate-600',
  Normal: 'text-sky-700',
  High: 'text-orange-700',
  Urgent: 'text-red-700',
};

// Automated notification types delivered to customers (never shown as an
// agent's own inbox content).
export const CUSTOMER_NOTIFICATION_TYPES = [
  { value: 'application_received', label: 'Application Received' },
  { value: 'loan_approved', label: 'Loan Approved' },
  { value: 'loan_rejected', label: 'Loan Rejected' },
  { value: 'loan_disbursed', label: 'Loan Disbursed' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'overdue_notice', label: 'Overdue Notice' },
  { value: 'account_update', label: 'Account Update' },
  { value: 'announcement', label: 'Announcement' },
];

export const NOTIFICATION_TYPE_LABELS = Object.fromEntries(
  CUSTOMER_NOTIFICATION_TYPES.map((type) => [type.value, type.label])
);

// Delivery channels surfaced on customer notifications (WhatsApp Business,
// SMS, Email — mirrors the WhatsApp Business API integration).
export const DELIVERY_CHANNELS = ['WhatsApp', 'SMS', 'Email'];

export function statusBadgeClass(status) {
  return STATUS_BADGE_CLASSES[status] || 'bg-slate-100 text-slate-600';
}

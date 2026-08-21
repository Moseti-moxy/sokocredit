const NOTIFICATIONS_STORAGE_KEY = 'sokocredit-notifications-v1';
const STAFF_ROLES = ['admin', 'agent', 'loan_officer'];

function readAll() {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || '[]');
    return Array.isArray(notifications) ? notifications : [];
  } catch { return []; }
}

function writeAll(notifications) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event('sokocredit:notifications'));
}

export function getNotifications(role, customerId) {
  return readAll().filter((notification) => notification.roles.includes(role) && (!notification.customerId || notification.customerId === customerId));
}

export function createLoanRequestNotifications({ customer, amount, purpose, loanId }) {
  const notification = {
    id: `NTF-${Date.now()}`,
    roles: STAFF_ROLES,
    title: 'New loan request',
    message: `${customer} requested KES ${Number(amount).toLocaleString()}${purpose ? ` for ${purpose}` : ''}.`,
    loanId,
    createdAt: new Date().toISOString(),
    readBy: [],
  };
  writeAll([notification, ...readAll()].slice(0, 100));
}

export function createCustomerNotification({ customerId, title, message, loanId }) {
  if (!customerId) return;
  const notification = { id: `NTF-${Date.now()}`, roles: ['customer'], customerId, title, message, loanId, createdAt: new Date().toISOString(), readBy: [] };
  writeAll([notification, ...readAll()].slice(0, 100));
}

export function markAllNotificationsRead(role) {
  writeAll(readAll().map((notification) => notification.roles.includes(role) && !notification.readBy.includes(role)
    ? { ...notification, readBy: [...notification.readBy, role] }
    : notification));
}

export { NOTIFICATIONS_STORAGE_KEY };

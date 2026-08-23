import { ACTIVE_CASE_STATUSES } from './constants';

// Role-scoped selectors enforce the ownership model:
//   Customers see ONLY their own notifications and conversations.
//   Agents see cases assigned to them plus unassigned ones they can claim.
//   Admins see everything, for oversight and reassignment.

const byNewestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const byRecentlyUpdated = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

// --- Customer scope -------------------------------------------------------

export function selectCustomerNotifications(state, userId) {
  return state.communications.notifications
    .filter((notification) => notification.channel === 'customer' && notification.userId === userId)
    .sort(byNewestFirst);
}

export function selectCustomerConversations(state, userId) {
  return state.communications.supportCases
    .filter((item) => item.customerId === userId)
    .sort(byRecentlyUpdated);
}

// --- Agent scope ----------------------------------------------------------

export function selectAgentQueue(state, agentId) {
  return state.communications.supportCases
    .filter((item) => item.assignedAgentId === agentId || item.assignedAgentId === null)
    .sort(byRecentlyUpdated);
}

export function selectStaffNotifications(state, userId) {
  return state.communications.notifications
    .filter((notification) => notification.channel === 'staff' && notification.userId === userId)
    .sort(byNewestFirst);
}

// --- Admin scope ----------------------------------------------------------

export function selectAllCases(state) {
  return [...state.communications.supportCases].sort(byRecentlyUpdated);
}

export function selectEscalatedCases(state) {
  return state.communications.supportCases
    .filter((item) => item.status === 'Escalated')
    .sort(byNewestFirst);
}

export function selectUnresolvedCases(state) {
  return state.communications.supportCases
    .filter((item) => ACTIVE_CASE_STATUSES.includes(item.status))
    .sort(byRecentlyUpdated);
}

export function selectAnnouncements(state) {
  return [...state.communications.announcements].sort(byNewestFirst);
}

export function selectActivityLog(state) {
  return state.communications.activityLog;
}

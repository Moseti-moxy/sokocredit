import { createSlice } from '@reduxjs/toolkit';
import { buildSeedData, SEED_VERSION } from './seedData';

// Single source of truth for support cases, customer notifications,
// announcements, and the communication activity log. Persisted to
// localStorage so state survives refreshes and is shared across every
// role's dashboard in this browser profile.

const STORAGE_KEY = 'sokocredit.communications.v1';

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedData();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.seedVersion !== SEED_VERSION) return buildSeedData();
    return {
      supportCases: parsed.supportCases ?? [],
      notifications: parsed.notifications ?? [],
      announcements: parsed.announcements ?? [],
      activityLog: parsed.activityLog ?? [],
      counters: parsed.counters ?? { case: 1006, notification: 1012, announcement: 1002, activity: 1009 },
    };
  } catch {
    // Corrupt storage -> fall back to a clean seed rather than crash.
    return buildSeedData();
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, seedVersion: SEED_VERSION })
    );
  } catch {
    // Storage unavailable (private mode/quota) — keep working in-memory.
  }
}

const nowIso = () => new Date().toISOString();

function pushActivity(state, { type, actorId, actorName, caseId = null, summary, details = '' }) {
  state.activityLog.unshift({
    id: `ACT-${state.counters.activity++}`,
    type,
    actorId,
    actorName,
    caseId,
    summary,
    details,
    createdAt: nowIso(),
  });
}

function findCase(state, caseId) {
  return state.supportCases.find((item) => item.id === caseId);
}

const communicationsSlice = createSlice({
  name: 'communications',
  initialState: loadInitialState(),
  reducers: {
    // Customer creates a new support request -> enters the agent work queue
    // as an unassigned Open case.
    createSupportCase(state, action) {
      const { customerId, customerName, nationalId, phone, loanRef, category, subject, description } = action.payload;
      const id = `CASE-${state.counters.case++}`;
      const createdAt = nowIso();
      state.supportCases.unshift({
        id,
        customerId,
        customerName,
        nationalId: nationalId || '',
        phone: phone || '',
        loanRef: loanRef || null,
        category,
        subject,
        status: 'Open',
        priority: 'Normal',
        assignedAgentId: null,
        assignedAgentName: null,
        escalatedAt: null,
        escalationReason: null,
        resolvedAt: null,
        createdAt,
        updatedAt: createdAt,
        messages: [
          { sender: 'customer', senderId: customerId, senderName: customerName, text: description, at: createdAt, internal: false },
        ],
      });
      pushActivity(state, {
        type: 'case_created',
        actorId: customerId,
        actorName: customerName,
        caseId: id,
        summary: `New support case ${id} created`,
        details: `Category: ${category} — "${subject}"`,
      });
      persist(state);
    },

    // Append a message to a case thread. Staff replies move an Open case to
    // In Progress; a customer reply pulls a Waiting-for-Customer case back
    // into active work. Internal notes never touch customer-visible status.
    appendCaseMessage(state, action) {
      const { caseId, sender, senderId, senderName, text, internal = false } = action.payload;
      const target = findCase(state, caseId);
      if (!target) return;
      const at = nowIso();
      target.messages.push({ sender, senderId, senderName, text, at, internal });
      target.updatedAt = at;
      if (!internal) {
        if ((sender === 'agent' || sender === 'admin') && target.status === 'Open') {
          target.status = 'In Progress';
        }
        if (sender === 'customer' && target.status === 'Waiting for Customer') {
          target.status = 'In Progress';
        }
      }
      pushActivity(state, {
        type: internal ? 'note_added' : 'reply',
        actorId: senderId,
        actorName: senderName,
        caseId,
        summary: internal ? `Internal note added on ${caseId}` : `${senderName} replied on ${caseId}`,
        details: text.length > 120 ? `${text.slice(0, 117)}…` : text,
      });
      persist(state);
    },

    // Status transitions: Open / In Progress / Waiting for Customer /
    // Resolved / Escalated. Escalation records a reason and surfaces the
    // case in the Admin Communication Center.
    changeCaseStatus(state, action) {
      const { caseId, status, actorId, actorName, reason = '' } = action.payload;
      const target = findCase(state, caseId);
      if (!target || target.status === status) return;
      target.status = status;
      target.updatedAt = nowIso();
      if (status === 'Escalated') {
        target.escalatedAt = target.updatedAt;
        target.escalationReason = reason || 'Escalated for management review.';
      }
      if (status === 'Resolved') {
        target.resolvedAt = target.updatedAt;
      }
      pushActivity(state, {
        type: status === 'Escalated' ? 'escalated' : status === 'Resolved' ? 'resolved' : 'status_changed',
        actorId,
        actorName,
        caseId,
        summary: status === 'Escalated'
          ? `${caseId} escalated to management`
          : `${caseId} moved to ${status}`,
        details: reason,
      });
      persist(state);
    },

    // Assignment / reassignment. Reassigning an escalated case returns it
    // to active work under the new agent.
    assignCase(state, action) {
      const { caseId, agentId, agentName, actorId, actorName } = action.payload;
      const target = findCase(state, caseId);
      if (!target) return;
      const previousAgent = target.assignedAgentName;
      target.assignedAgentId = agentId;
      target.assignedAgentName = agentName;
      if (target.status === 'Escalated') target.status = 'In Progress';
      target.updatedAt = nowIso();
      pushActivity(state, {
        type: 'assigned',
        actorId,
        actorName,
        caseId,
        summary: previousAgent && previousAgent !== agentName
          ? `${caseId} reassigned from ${previousAgent} to ${agentId} ${agentName}`
          : `${caseId} assigned to ${agentId} ${agentName}`,
        details: '',
      });
      persist(state);
    },

    markNotificationRead(state, action) {
      const notification = state.notifications.find((item) => item.id === action.payload.notificationId);
      if (notification) notification.read = true;
      persist(state);
    },

    markAllNotificationsRead(state, action) {
      const { userId, channel } = action.payload;
      state.notifications.forEach((notification) => {
        if (notification.userId === userId && notification.channel === channel) notification.read = true;
      });
      persist(state);
    },

    // Automated account events enter the customer's dedicated notification
    // inbox. Staff queues never consume these records.
    createCustomerNotification(state, action) {
      const {
        userId,
        type = 'account_update',
        title,
        body,
        refId = null,
        deliveryChannel = 'WhatsApp',
      } = action.payload;
      if (!userId || !title || !body) return;
      state.notifications.unshift({
        id: `NTF-${state.counters.notification++}`,
        channel: 'customer',
        userId,
        type,
        title,
        body,
        refId,
        deliveryChannel,
        read: false,
        createdAt: nowIso(),
      });
      persist(state);
    },

    // Admin broadcasts an announcement; each recipient gets it as a
    // notification in their own inbox (customer or staff channel).
    sendAnnouncement(state, action) {
      const { title, body, audience, recipientIds, sentById, sentByName } = action.payload;
      const id = `ANN-${state.counters.announcement++}`;
      const createdAt = nowIso();
      state.announcements.unshift({ id, title, body, audience, recipientIds, sentById, sentByName, createdAt });
      recipientIds.forEach((userId) => {
        state.notifications.unshift({
          id: `NTF-${state.counters.notification++}`,
          channel: audience === 'all_staff' ? 'staff' : 'customer',
          userId,
          type: 'announcement',
          title,
          body,
          refId: id,
          deliveryChannel: audience === 'all_staff' ? 'Internal' : 'WhatsApp',
          read: false,
          createdAt,
        });
      });
      pushActivity(state, {
        type: 'announcement',
        actorId: sentById,
        actorName: sentByName,
        caseId: null,
        summary: `Announcement sent to ${recipientIds.length} recipient${recipientIds.length === 1 ? '' : 's'}`,
        details: `${id} — ${title}`,
      });
      persist(state);
    },

    // Admin -> agent internal communication (never visible to customers).
    sendStaffMessages(state, action) {
      const { recipientIds, title, body, sentById, sentByName, refId = null } = action.payload;
      const createdAt = nowIso();
      recipientIds.forEach((userId) => {
        state.notifications.unshift({
          id: `NTF-${state.counters.notification++}`,
          channel: 'staff',
          userId,
          type: 'internal_message',
          title,
          body,
          refId,
          deliveryChannel: 'Internal',
          read: false,
          createdAt,
        });
      });
      pushActivity(state, {
        type: 'staff_message',
        actorId: sentById,
        actorName: sentByName,
        caseId: refId,
        summary: `Internal message sent to ${recipientIds.length} staff member${recipientIds.length === 1 ? '' : 's'}`,
        details: title,
      });
      persist(state);
    },

    // Dev/testing escape hatch: wipe local data back to the demo seed.
    resetCommunications() {
      const fresh = buildSeedData();
      persist(fresh);
      return fresh;
    },
  },
});

export const {
  createSupportCase,
  appendCaseMessage,
  changeCaseStatus,
  assignCase,
  markNotificationRead,
  markAllNotificationsRead,
  createCustomerNotification,
  sendAnnouncement,
  sendStaffMessages,
  resetCommunications,
} = communicationsSlice.actions;

export default communicationsSlice.reducer;

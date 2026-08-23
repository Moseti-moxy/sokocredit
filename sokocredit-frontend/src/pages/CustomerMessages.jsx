import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlarmClock, AlertTriangle, Banknote, BellRing, CheckCircle2, FileText,
  Megaphone, MessageCircle, Plus, Send, UserRoundCog, XCircle,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import StatusBadge from '../features/communications/components/StatusBadge';
import ConversationThread from '../features/communications/components/ConversationThread';
import { selectCustomerConversations, selectCustomerNotifications } from '../features/communications/selectors';
import {
  createSupportCase,
  appendCaseMessage,
  markNotificationRead,
  markAllNotificationsRead,
} from '../features/communications/communicationsSlice';
import {
  CUSTOMER_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  CASE_CATEGORIES,
} from '../features/communications/constants';
import { useAuth } from '../hooks/useAuth';
import { timeAgo } from '../utils/timeAgo';

// CUSTOMER communication interface.
//
// Two strictly separated parts:
//   1. Notifications — automated account messages (loan status, payment
//      reminders, overdue notices, announcements). Read-only + mark-as-read.
//   2. Support       — conversations the customer starts with support.
//
// Shows ONLY this customer's own data. Internal staff notes are filtered out
// by ConversationThread; agent/admin queues live on entirely different pages.

const NOTIFICATION_ICONS = {
  application_received: FileText,
  loan_approved: CheckCircle2,
  loan_rejected: XCircle,
  loan_disbursed: Banknote,
  payment_reminder: AlarmClock,
  overdue_notice: AlertTriangle,
  account_update: UserRoundCog,
  announcement: Megaphone,
};

const CHANNEL_BADGE_CLASSES = {
  WhatsApp: 'bg-emerald-100 text-emerald-700',
  SMS: 'bg-sky-100 text-sky-700',
  Email: 'bg-violet-100 text-violet-700',
};

const emptyForm = { category: '', subject: '', description: '', loanRef: '' };

export default function CustomerMessages() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('notifications');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [replyText, setReplyText] = useState('');

  // Role-scoped selectors: only this customer's own records are read.
  const communications = useSelector((state) => state.communications);
  const notifications = useMemo(
    () => selectCustomerNotifications({ communications }, user.id),
    [communications, user.id]
  );
  const conversations = useMemo(
    () => selectCustomerConversations({ communications }, user.id),
    [communications, user.id]
  );

  const unreadCount = notifications.filter((item) => !item.read).length;
  const openCases = conversations.filter((item) => item.status !== 'Resolved').length;

  const filteredNotifications = useMemo(() => {
    if (typeFilter === 'all') return notifications;
    return notifications.filter((item) => item.type === typeFilter);
  }, [notifications, typeFilter]);

  const selectedCase = conversations.find((item) => item.id === selectedCaseId) || null;

  function toggleNotification(notification) {
    setExpandedNotificationId((current) => (current === notification.id ? null : notification.id));
    if (!notification.read) dispatch(markNotificationRead({ notificationId: notification.id }));
  }

  function submitSupportRequest(event) {
    event.preventDefault();
    if (!form.category || !form.subject.trim() || !form.description.trim()) {
      setFormError('Choose a category and fill in both the subject and description.');
      return;
    }
    dispatch(
      createSupportCase({
        customerId: user.id,
        customerName: user.name,
        nationalId: user.nationalId || '',
        phone: user.phone || '',
        loanRef: form.loanRef.trim(),
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
      })
    );
    setForm(emptyForm);
    setFormError('');
    setShowNewForm(false);
  }

  function sendReply(event) {
    event.preventDefault();
    const text = replyText.trim();
    if (!text || !selectedCase) return;
    dispatch(
      appendCaseMessage({
        caseId: selectedCase.id,
        sender: 'customer',
        senderId: user.id,
        senderName: user.name,
        text,
      })
    );
    setReplyText('');
  }

  return (
    <AppShell
      title="Messages"
      subtitle="Your notifications and support conversations in one place."
    >
      {/* Identity strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
          <MessageCircle size={13} /> Customer ID: <span className="font-mono">{user.id}</span>
        </span>
        <span className="text-xs text-slate-500">Signed in as {user.name}</span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unreadCount}</span>
          )}
        </TabButton>
        <TabButton active={activeTab === 'support'} onClick={() => setActiveTab('support')}>
          Support Conversations
          {openCases > 0 && (
            <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">{openCases}</span>
          )}
        </TabButton>
      </div>

      {/* ------------------------------ Notifications tab */}
      {activeTab === 'notifications' && (
        <section aria-label="Automated account notifications">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Automated updates about your loans, payments, and account. You cannot reply here — use{' '}
              <button type="button" onClick={() => setActiveTab('support')} className="font-medium text-brand-600 hover:underline">
                Support Conversations
              </button>{' '}
              to reach our team.
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => dispatch(markAllNotificationsRead({ userId: user.id, channel: 'customer' }))}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Type filter chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            <ChipButton active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All types</ChipButton>
            {CUSTOMER_NOTIFICATION_TYPES.map((type) => (
              <ChipButton key={type.value} active={typeFilter === type.value} onClick={() => setTypeFilter(type.value)}>
                {type.label}
              </ChipButton>
            ))}
          </div>

          {/* Notification list */}
          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <EmptyState icon={Megaphone} title="No notifications" body="Loan approvals, payment reminders, and account updates will appear here." />
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || BellRing;
                const expanded = expandedNotificationId === notification.id;
                return (
                  <article key={notification.id}>
                    <button
                      type="button"
                      onClick={() => toggleNotification(notification)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                        expanded ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${notification.read ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-600'}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                            {notification.title}
                          </span>
                          {!notification.read && <span className="size-2 rounded-full bg-red-500" aria-label="Unread" />}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHANNEL_BADGE_CLASSES[notification.deliveryChannel] || 'bg-slate-100 text-slate-600'}`}>
                            via {notification.deliveryChannel}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-500">{notification.body}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {NOTIFICATION_TYPE_LABELS[notification.type]} · {timeAgo(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                    {expanded && (
                      <div className="mx-4 rounded-b-2xl border border-t-0 border-brand-200 bg-white px-5 py-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notification.body}</p>
                        {notification.refId && (
                          <p className="mt-2 font-mono text-xs text-slate-400">Reference: {notification.refId}</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ------------------------------ Support tab */}
      {activeTab === 'support' && (
        <section aria-label="Support conversations">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Questions or problems? Open a request and chat with your assigned support agent.
            </p>
            <button
              type="button"
              onClick={() => setShowNewForm((visible) => !visible)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus size={16} /> New Support Request
            </button>
          </div>

          {showNewForm && (
            <form onSubmit={submitSupportRequest} className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-display font-semibold text-slate-900">Describe your issue</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Category *
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">Select a category…</option>
                    {CASE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Loan reference (optional)
                  <input
                    value={form.loanRef}
                    onChange={(event) => setForm({ ...form, loanRef: event.target.value })}
                    placeholder="e.g. LN-2024-014"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Subject *
                <input
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="Brief summary of your issue"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Describe the problem *
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Tell us what happened and what you need help with…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); setFormError(''); }}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Conversation cards */}
          <div className="space-y-2.5">
            {conversations.length === 0 ? (
              <EmptyState icon={MessageCircle} title="No support conversations yet" body="Create a support request above and an agent will be assigned to help you." />
            ) : (
              conversations.map((conversation) => {
                const lastVisible = [...conversation.messages].reverse().find((message) => !message.internal);
                const selected = selectedCaseId === conversation.id;
                return (
                  <article key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(selected ? null : conversation.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                        selected ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-semibold text-slate-400">{conversation.id}</p>
                          <h3 className="truncate font-semibold text-slate-900">{conversation.subject}</h3>
                        </div>
                        <StatusBadge status={conversation.status} size="xs" />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">
                        {lastVisible ? lastVisible.text : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>Category: {conversation.category}</span>
                        <span>
                          Agent: {conversation.assignedAgentName ? `${conversation.assignedAgentName}` : 'Awaiting assignment'} · Updated {timeAgo(conversation.updatedAt)}
                        </span>
                      </div>
                    </button>

                    {selected && (
                      <div className="rounded-b-2xl border border-t-0 border-brand-200 bg-white p-5">
                        <ConversationThread messages={conversation.messages} viewerIsStaff={false} />
                        {conversation.status === 'Resolved' ? (
                          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            This conversation is resolved. Start a new request if you need more help.
                          </p>
                        ) : (
                          <form onSubmit={sendReply} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            <textarea
                              aria-label="Type your reply"
                              rows={3}
                              value={replyText}
                              onChange={(event) => setReplyText(event.target.value)}
                              placeholder="Type your message…"
                              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                            />
                            <button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Send size={14} /> Send Reply
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function ChipButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Icon size={36} className="mx-auto mb-3 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

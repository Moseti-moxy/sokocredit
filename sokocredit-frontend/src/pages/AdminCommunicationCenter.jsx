import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertTriangle, Building2, CheckCircle2, Inbox, Megaphone, MessageSquare,
  Send, ShieldAlert, TrendingUp, UserRoundCheck, Users,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import StatusBadge from '../features/communications/components/StatusBadge';
import PriorityBadge from '../features/communications/components/PriorityBadge';
import CaseDetailPanel from '../features/communications/components/CaseDetailPanel';
import {
  selectEscalatedCases,
  selectUnresolvedCases,
  selectAnnouncements,
  selectActivityLog,
} from '../features/communications/selectors';
import {
  changeCaseStatus,
  assignCase,
  appendCaseMessage,
  sendAnnouncement,
  sendStaffMessages,
} from '../features/communications/communicationsSlice';
import { ACTIVE_CASE_STATUSES } from '../features/communications/constants';
import { useAuth } from '../hooks/useAuth';
import { getStaffDirectory, getAllCustomerIds } from '../data/mockAuth';
import { timeAgo } from '../utils/timeAgo';

// ADMIN communication interface — "Communication Center".
//
// An oversight and management console, not an inbox: escalated cases,
// unresolved conversations across all agents, direct agent communication,
// platform-wide announcements, and a full communication activity log.
// Admins can view any conversation, reassign work, and broadcast.

const TABS = [
  { id: 'escalated', label: 'Escalated Cases' },
  { id: 'unresolved', label: 'Unresolved Conversations' },
  { id: 'agents', label: 'Agent Communication' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'activity', label: 'Communication Activity' },
];

const ACTIVITY_ICONS = {
  case_created: Inbox,
  reply: MessageSquare,
  note_added: ShieldAlert,
  status_changed: TrendingUp,
  escalated: AlertTriangle,
  resolved: CheckCircle2,
  assigned: UserRoundCheck,
  announcement: Megaphone,
  staff_message: Send,
};

const emptyAnnouncement = { title: '', body: '', audience: 'all_customers' };
const emptyStaffMessage = { recipient: 'all', title: '', body: '' };

export default function AdminCommunicationCenter() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('escalated');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncement);
  const [announcementError, setAnnouncementError] = useState('');
  const [staffMessageForm, setStaffMessageForm] = useState(emptyStaffMessage);
  const [staffMessageError, setStaffMessageError] = useState('');

  const communications = useSelector((state) => state.communications);
  const escalatedCases = useMemo(() => selectEscalatedCases({ communications }), [communications]);
  const unresolvedCases = useMemo(() => selectUnresolvedCases({ communications }), [communications]);
  const announcements = useMemo(() => selectAnnouncements({ communications }), [communications]);
  const activityLog = useMemo(() => selectActivityLog({ communications }), [communications]);

  // Staff directory is read once per render pass; it lives in account storage.
  const agents = useMemo(
    () => getStaffDirectory().filter((member) => member.role !== 'admin'),
    []
  );

  const visibleCases = activeTab === 'unresolved' ? unresolvedCases : escalatedCases;
  const selectedCase = communications.supportCases.find((item) => item.id === selectedCaseId) || null;

  function handleStatusChange(status, reason) {
    dispatch(changeCaseStatus({ caseId: selectedCase.id, status, actorId: user.id, actorName: user.name, reason }));
  }

  function handleAssign(agentId, agentName) {
    dispatch(assignCase({ caseId: selectedCase.id, agentId, agentName, actorId: user.id, actorName: user.name }));
  }

  function handleReply(text) {
    dispatch(appendCaseMessage({ caseId: selectedCase.id, sender: 'admin', senderId: user.id, senderName: user.name, text }));
  }

  function handleAddNote(text) {
    dispatch(appendCaseMessage({ caseId: selectedCase.id, sender: 'admin', senderId: user.id, senderName: user.name, text, internal: true }));
  }

  function submitAnnouncement(event) {
    event.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      setAnnouncementError('Both a title and message are required.');
      return;
    }
    const recipientIds = announcementForm.audience === 'all_staff'
      ? getStaffDirectory().map((member) => member.id)
      : getAllCustomerIds();
    if (recipientIds.length === 0) {
      setAnnouncementError('No recipients found for this audience.');
      return;
    }
    dispatch(sendAnnouncement({
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      audience: announcementForm.audience,
      recipientIds,
      sentById: user.id,
      sentByName: user.name,
    }));
    setAnnouncementForm(emptyAnnouncement);
    setAnnouncementError('');
  }

  function submitStaffMessage(event) {
    event.preventDefault();
    if (!staffMessageForm.title.trim() || !staffMessageForm.body.trim()) {
      setStaffMessageError('Both a subject and message are required.');
      return;
    }
    const recipients = staffMessageForm.recipient === 'all'
      ? agents.map((agent) => agent.id)
      : [staffMessageForm.recipient];
    if (recipients.length === 0) {
      setStaffMessageError('No staff members available.');
      return;
    }
    dispatch(sendStaffMessages({
      recipientIds: recipients,
      title: `${user.id} ${user.name}: ${staffMessageForm.title.trim()}`,
      body: staffMessageForm.body.trim(),
      sentById: user.id,
      sentByName: user.name,
    }));
    setStaffMessageForm(emptyStaffMessage);
    setStaffMessageError('');
  }

  const agentWorkload = useMemo(() => {
    const workload = {};
    communications.supportCases.forEach((item) => {
      if (!item.assignedAgentId) return;
      workload[item.assignedAgentId] ??= { open: 0, resolved: 0 };
      if (ACTIVE_CASE_STATUSES.includes(item.status)) workload[item.assignedAgentId].open += 1;
      if (item.status === 'Resolved') workload[item.assignedAgentId].resolved += 1;
    });
    return workload;
  }, [communications.supportCases]);

  return (
    <AppShell title="Communication Center" subtitle="Oversight of support cases, agents, and platform-wide communication.">
      {/* Admin identity strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
          <Building2 size={13} /> Admin ID: <span className="font-mono">{user.id}</span>
        </span>
        <span className="text-xs text-slate-500">{user.name} · Management console</span>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={ShieldAlert} tint="bg-violet-100 text-violet-600" label="Escalated Cases" value={escalatedCases.length} />
        <SummaryCard icon={TrendingUp} tint="bg-red-100 text-red-600" label="Unresolved Conversations" value={unresolvedCases.length} />
        <SummaryCard icon={Users} tint="bg-emerald-100 text-emerald-600" label="Active Agents" value={agents.length} />
        <SummaryCard icon={Megaphone} tint="bg-sky-100 text-sky-600" label="Announcements Sent" value={announcements.length} />
      </div>

      {/* Section tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setSelectedCaseId(null); }}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------ Escalated / Unresolved */}
      {(activeTab === 'escalated' || activeTab === 'unresolved') && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                {activeTab === 'escalated' ? 'Cases escalated by agents' : 'Open conversations across all agents'}
              </h2>
            </header>
            {visibleCases.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {activeTab === 'escalated' ? 'No escalated cases — the queue is clear.' : 'No unresolved conversations.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleCases.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(selectedCaseId === item.id ? null : item.id)}
                      className={`flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        selectedCaseId === item.id ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-400">
                          {item.id} <StatusBadge status={item.status} size="xs" />
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{item.subject}</p>
                        <p className="truncate text-xs text-slate-500">
                          {item.customerName} ({item.customerId}) · {item.category}
                          {activeTab === 'escalated' && item.escalationReason ? ` · ${item.escalationReason}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <PriorityBadge priority={item.priority} />
                        <span className="hidden text-xs text-slate-400 sm:inline">
                          Agent: {item.assignedAgentName || 'Unassigned'}
                        </span>
                        <span className="text-xs text-slate-400">{timeAgo(item.updatedAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedCase && (
            <CaseDetailPanel
              caseItem={selectedCase}
              viewerRole="admin"
              currentUserId={user.id}
              currentUserName={user.name}
              agents={agents}
              onReply={handleReply}
              onAddNote={handleAddNote}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
            />
          )}
        </div>
      )}

      {/* ------------------------------ Agent Communication */}
      {activeTab === 'agents' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Agent directory" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Support team & current workload</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Staff ID</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Open</th>
                    <th className="px-4 py-2.5">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{agent.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{agent.name}</td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-500">{agent.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3">{agentWorkload[agent.id]?.open ?? 0}</td>
                      <td className="px-4 py-3">{agentWorkload[agent.id]?.resolved ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Send internal message" className="h-fit rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">Message an agent</h2>
            <p className="mb-4 text-xs text-slate-500">
              Internal guidance only — lands in the agent's Support Inbox under “Internal Messages”. Customers never see this.
            </p>
            <form onSubmit={submitStaffMessage} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Recipient
                <select
                  value={staffMessageForm.recipient}
                  onChange={(event) => setStaffMessageForm({ ...staffMessageForm, recipient: event.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="all">All agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.id} — {agent.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Subject
                <input
                  value={staffMessageForm.title}
                  onChange={(event) => setStaffMessageForm({ ...staffMessageForm, title: event.target.value })}
                  placeholder="e.g. Prioritise CASE-1002 today"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Message
                <textarea
                  rows={4}
                  value={staffMessageForm.body}
                  onChange={(event) => setStaffMessageForm({ ...staffMessageForm, body: event.target.value })}
                  placeholder="Write your guidance…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              {staffMessageError && <p role="alert" className="text-sm text-red-600">{staffMessageError}</p>}
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">
                <Send size={14} /> Send Internal Message
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ------------------------------ Announcements */}
      {activeTab === 'announcements' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Compose announcement" className="h-fit rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">New announcement</h2>
            <p className="mb-4 text-xs text-slate-500">
              Delivered to each recipient's own notification inbox (customers see it alongside their loan updates).
            </p>
            <form onSubmit={submitAnnouncement} className="space-y-3">
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Audience</legend>
                <div className="mt-1.5 flex gap-2">
                  {[
                    { value: 'all_customers', label: 'All Customers' },
                    { value: 'all_staff', label: 'All Staff' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        announcementForm.audience === option.value
                          ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audience"
                        value={option.value}
                        checked={announcementForm.audience === option.value}
                        onChange={(event) => setAnnouncementForm({ ...announcementForm, audience: event.target.value })}
                        className="accent-brand-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-medium text-slate-700">
                Title
                <input
                  value={announcementForm.title}
                  onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })}
                  placeholder="e.g. New Paybill number effective Monday"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Message
                <textarea
                  rows={4}
                  value={announcementForm.body}
                  onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })}
                  placeholder="Write the announcement…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
              {announcementError && <p role="alert" className="text-sm text-red-600">{announcementError}</p>}
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
                <Megaphone size={15} /> Send Announcement
              </button>
            </form>
          </section>

          <section aria-label="Announcement history" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Sent announcements</h2>
            </header>
            {announcements.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Nothing sent yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {announcements.map((announcement) => (
                  <li key={announcement.id} className="px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {announcement.title}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {announcement.audience === 'all_staff' ? 'Staff' : 'Customers'}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{announcement.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {announcement.recipientIds.length} recipients · by {announcement.sentById} {announcement.sentByName} · {timeAgo(announcement.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------ Activity log */}
      {activeTab === 'activity' && (
        <section aria-label="Communication activity" className="rounded-xl border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Every communication event, newest first</h2>
          </header>
          <ul className="divide-y divide-slate-100">
            {activityLog.map((entry) => {
              const Icon = ACTIVITY_ICONS[entry.type] || MessageSquare;
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{entry.summary}</p>
                    {entry.details && <p className="mt-0.5 text-xs text-slate-500">{entry.details}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className="font-mono">{entry.actorId}</span> {entry.actorName} · {timeAgo(entry.createdAt)}
                      {entry.caseId ? ` · ${entry.caseId}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, tint, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <span className={`grid size-10 place-items-center rounded-lg ${tint}`}>
        <Icon size={20} />
      </span>
    </div>
  );
}

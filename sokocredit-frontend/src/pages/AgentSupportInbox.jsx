import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowDownWideNarrow, Clock, Headset, Inbox, Mail, MailOpen, Search,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import StatusBadge from '../features/communications/components/StatusBadge';
import PriorityBadge from '../features/communications/components/PriorityBadge';
import CaseDetailPanel from '../features/communications/components/CaseDetailPanel';
import { selectAgentQueue, selectStaffNotifications } from '../features/communications/selectors';
import {
  appendCaseMessage,
  changeCaseStatus,
  assignCase,
  markNotificationRead,
} from '../features/communications/communicationsSlice';
import { CASE_CATEGORIES, CASE_PRIORITIES, CASE_STATUSES, ACTIVE_CASE_STATUSES } from '../features/communications/constants';
import { useAuth } from '../hooks/useAuth';
import { timeAgo, isSameDay } from '../utils/timeAgo';

// AGENT communication interface — "Customer Support" work queue.
//
// Deliberately NOT a customer-style inbox: this is an internal staff
// workspace with a three-section layout (queue rail / case list / case
// detail), summary metrics, search + filters, status control, escalation,
// and a staff-only internal messages panel.
//
// Visibility: only cases assigned to this agent (or unassigned ones they
// can claim). Customer notification feeds never appear here.

const QUEUE_FILTERS = ['All', ...CASE_STATUSES, 'Unassigned'];

export default function AgentSupportInbox() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Role-scoped queue: mine + unassigned claimable cases.
  const communications = useSelector((state) => state.communications);
  const queue = useMemo(() => selectAgentQueue({ communications }, user.id), [communications, user.id]);
  const staffMessages = useMemo(
    () => selectStaffNotifications({ communications }, user.id),
    [communications, user.id]
  );

  const unreadStaffMessages = staffMessages.filter((message) => !message.read);

  // Summary metrics
  const metrics = useMemo(() => ({
    open: queue.filter((item) => item.status === 'Open').length,
    assignedToMe: queue.filter((item) => item.assignedAgentId === user.id && ACTIVE_CASE_STATUSES.includes(item.status)).length,
    pendingResponse: queue.filter((item) => {
      if (!ACTIVE_CASE_STATUSES.includes(item.status)) return false;
      const lastMessage = item.messages[item.messages.length - 1];
      return lastMessage?.sender === 'customer';
    }).length,
    resolvedToday: queue.filter((item) => item.resolvedAt && isSameDay(item.resolvedAt)).length,
  }), [queue, user.id]);

  // Filtering pipeline: rail filter -> category -> priority -> search -> sort
  const filteredQueue = useMemo(() => {
    let items = queue;
    if (statusFilter === 'Unassigned') items = items.filter((item) => !item.assignedAgentId);
    else if (statusFilter !== 'All') items = items.filter((item) => item.status === statusFilter);
    if (categoryFilter !== 'all') items = items.filter((item) => item.category === categoryFilter);
    if (priorityFilter !== 'all') items = items.filter((item) => item.priority === priorityFilter);
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      items = items.filter((item) =>
        item.customerName.toLowerCase().includes(needle) ||
        item.customerId.toLowerCase().includes(needle) ||
        item.subject.toLowerCase().includes(needle) ||
        item.id.toLowerCase().includes(needle)
      );
    }
    return [...items].sort((a, b) =>
      sortOrder === 'oldest' ? new Date(a.updatedAt) - new Date(b.updatedAt) : new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [queue, statusFilter, categoryFilter, priorityFilter, searchQuery, sortOrder]);

  const selectedCase = filteredQueue.find((item) => item.id === selectedCaseId)
    || queue.find((item) => item.id === selectedCaseId)
    || null;

  function handleReply(text) {
    dispatch(appendCaseMessage({ caseId: selectedCase.id, sender: 'agent', senderId: user.id, senderName: user.name, text }));
  }

  function handleAddNote(text) {
    dispatch(appendCaseMessage({ caseId: selectedCase.id, sender: 'agent', senderId: user.id, senderName: user.name, text, internal: true }));
  }

  function handleStatusChange(status, reason) {
    dispatch(changeCaseStatus({ caseId: selectedCase.id, status, actorId: user.id, actorName: user.name, reason }));
  }

  function handleAssign(agentId, agentName) {
    dispatch(assignCase({ caseId: selectedCase.id, agentId, agentName, actorId: user.id, actorName: user.name }));
  }

  const railCounts = useMemo(() => {
    const counts = { All: queue.length, Unassigned: queue.filter((item) => !item.assignedAgentId).length };
    CASE_STATUSES.forEach((status) => {
      counts[status] = queue.filter((item) => item.status === status).length;
    });
    return counts;
  }, [queue]);

  return (
    <AppShell title="Customer Support" subtitle="Your support work queue — manage assigned customer cases.">
      {/* Staff identity strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
          <Headset size={13} /> Agent ID: <span className="font-mono">{user.id}</span>
        </span>
        <span className="text-xs text-slate-500">{user.name} · Internal support workspace</span>
      </div>

      {/* Summary metric cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Open Cases" value={metrics.open} accent="text-red-600" />
        <MetricCard label="Assigned to Me" value={metrics.assignedToMe} accent="text-slate-900" />
        <MetricCard label="Pending Response" value={metrics.pendingResponse} accent="text-orange-600" />
        <MetricCard label="Resolved Today" value={metrics.resolvedToday} accent="text-emerald-600" />
      </div>

      {/* Search + filters toolbar */}
      <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search customers or support cases"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by customer name, Customer ID, case number, or subject…"
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All categories</option>
            {CASE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All priorities</option>
            {CASE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((order) => (order === 'newest' ? 'oldest' : 'newest'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowDownWideNarrow size={14} />
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
          {(categoryFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => { setCategoryFilter('all'); setPriorityFilter('all'); setSearchQuery(''); }}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Three-section workspace */}
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,340px)_minmax(0,1fr)]">
        {/* Section 1 — queue rail */}
        <nav aria-label="Queue filters" className="h-fit rounded-xl border border-slate-200 bg-white p-2">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Queues</p>
          {QUEUE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                statusFilter === filter ? 'bg-slate-800 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{filter}</span>
              <span className={`font-mono text-xs ${statusFilter === filter ? 'text-slate-300' : 'text-slate-400'}`}>
                {railCounts[filter] ?? 0}
              </span>
            </button>
          ))}
        </nav>

        {/* Section 2 — conversation list */}
        <section aria-label="Customer conversations" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Conversations</h2>
            <span className="font-mono text-xs text-slate-400">{filteredQueue.length}</span>
          </header>
          <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No conversations match</p>
                <p className="mt-1 text-xs text-slate-400">Adjust the queue, filters, or search.</p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const lastMessage = item.messages[item.messages.length - 1];
                const isSelected = selectedCaseId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCaseId(item.id)}
                    className={`block w-full border-l-4 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'border-l-brand-500 bg-brand-50/60' : 'border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-400">{item.id}</span>
                      <StatusBadge status={item.status} size="xs" />
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{item.customerName}</p>
                    <p className="truncate text-xs text-slate-600">{item.subject}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <PriorityBadge priority={item.priority} />
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={11} /> {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    {lastMessage && (
                      <p className="mt-1 line-clamp-1 text-[11px] italic text-slate-400">
                        {lastMessage.sender === 'customer' ? 'Customer:' : `${lastMessage.senderName}:`} “{lastMessage.text}”
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Section 3 — case detail */}
        <section aria-label="Case detail" className="min-h-[480px]">
          {selectedCase ? (
            <CaseDetailPanel
              caseItem={selectedCase}
              viewerRole="agent"
              currentUserId={user.id}
              currentUserName={user.name}
              onReply={handleReply}
              onAddNote={handleAddNote}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
            />
          ) : (
            <div className="grid h-full min-h-[480px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div>
                <Headset size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-600">Select a conversation</p>
                <p className="mt-1 max-w-xs text-sm text-slate-400">
                  Pick a case from the queue to view the full history and reply to the customer.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Internal staff messages — separate from any customer feed */}
      <section aria-label="Internal staff messages" className="mt-6 rounded-xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Mail size={15} className="text-slate-500" /> Internal Messages
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Staff only</span>
          </h2>
          {unreadStaffMessages.length > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {unreadStaffMessages.length} unread
            </span>
          )}
        </header>
        {staffMessages.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No internal messages from management.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {staffMessages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => dispatch(markNotificationRead({ notificationId: message.id }))}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${message.read ? '' : 'bg-amber-50/40'}`}
                >
                  {message.read ? <MailOpen size={16} className="mt-0.5 shrink-0 text-slate-400" /> : <Mail size={16} className="mt-0.5 shrink-0 text-brand-600" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{message.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{message.body}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {timeAgo(message.createdAt)}{message.refId ? ` · Ref ${message.refId}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`font-display text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

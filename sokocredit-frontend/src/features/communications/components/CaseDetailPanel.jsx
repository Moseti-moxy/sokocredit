import { useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageCircle, Send, ShieldQuestion, UserRoundCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import ConversationThread from './ConversationThread';
import { CASE_STATUSES } from '../constants';
import { timeAgo, formatDateTime } from '../../../utils/timeAgo';
import { sendWhatsAppMessage } from '../whatsappApi';

// Staff-side case workspace used by BOTH the Agent Support Inbox and the
// Admin Communication Center. The surrounding layouts differ per role; this
// panel carries the shared mechanics: customer info, thread, reply,
// status control, escalation, assignment.
//
// Props:
//   caseItem        - the support case object
//   viewerRole      - 'agent' | 'admin'
//   currentUserId   - staff ID of the viewer (AGT-0001 / ADM-0001)
//   currentUserName - display name of the viewer
//   agents          - [{ id, name }] available for reassignment (admin)
//   onReply(text)   - send a customer-visible reply
//   onAddNote(text) - add an internal note
//   onStatusChange(status, reason?) - transition the case
//   onAssign(agentId, agentName)    - assign/reassign the case
export default function CaseDetailPanel({
  caseItem,
  viewerRole,
  currentUserId,
  currentUserName,
  agents = [],
  onReply,
  onAddNote,
  onStatusChange,
  onAssign,
}) {
  const [replyText, setReplyText] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [sendAsWhatsApp, setSendAsWhatsApp] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState(null);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  if (!caseItem) return null;

  const isResolved = caseItem.status === 'Resolved';

  async function submitReply() {
    const text = replyText.trim();
    if (!text) return;
    if (noteMode) {
      onAddNote(text);
      setReplyText('');
      return;
    }
    onReply(text);
    setReplyText('');
    if (sendAsWhatsApp && caseItem.customerId) {
      setWhatsAppStatus(null);
      setIsSendingWhatsApp(true);
      const result = await sendWhatsAppMessage(caseItem.customerId, text);
      setIsSendingWhatsApp(false);
      setWhatsAppStatus(result.sent ? { ok: true, text: 'Sent over WhatsApp.' } : { ok: false, text: result.reason });
    }
  }

  function submitEscalation() {
    onStatusChange('Escalated', escalationReason.trim());
    setEscalationReason('');
    setShowEscalate(false);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-500">{caseItem.id}</p>
            <h3 className="mt-0.5 truncate font-display text-base font-semibold text-slate-900">{caseItem.subject}</h3>
          </div>
          <StatusBadge status={caseItem.status} />
        </div>
        <p className="text-xs text-slate-500">
          Received {formatDateTime(caseItem.createdAt)} · Last update {timeAgo(caseItem.updatedAt)}
        </p>
      </div>

      {/* Customer context */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-3 text-sm sm:grid-cols-3">
        <Info label="Customer" value={caseItem.customerName} />
        <Info label="Customer ID" value={caseItem.customerId} mono />
        <Info label="National ID" value={caseItem.nationalId || '—'} mono />
        <Info label="Phone" value={caseItem.phone || '—'} />
        <Info label="Loan Ref" value={caseItem.loanRef || '—'} mono />
        <Info label="Category" value={caseItem.category} />
        <Info label="Priority" value={<PriorityBadge priority={caseItem.priority} />} />
        <Info
          label="Assigned Agent"
          value={
            caseItem.assignedAgentId
              ? `${caseItem.assignedAgentId} · ${caseItem.assignedAgentName}`
              : 'Unassigned'
          }
        />
      </dl>

      {/* Thread */}
      <div className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-brand-50/30 px-5 py-4">
        <ConversationThread messages={caseItem.messages} viewerIsStaff />
      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-slate-200 px-5 py-4">
        {/* Status controls */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Case status</p>
          <div className="flex flex-wrap gap-1.5">
            {CASE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setShowEscalate(false);
                  onStatusChange(status);
                }}
                disabled={status === caseItem.status}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
                  status === caseItem.status
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
            {!showEscalate && caseItem.status !== 'Escalated' && (
              <button
                type="button"
                onClick={() => setShowEscalate(true)}
                className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
              >
                <ShieldQuestion size={13} /> Escalate…
              </button>
            )}
          </div>

          {showEscalate && (
            <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
              <label htmlFor="escalation-reason" className="block text-xs font-semibold text-violet-800">
                Why are you escalating this case?
              </label>
              <textarea
                id="escalation-reason"
                rows={2}
                value={escalationReason}
                onChange={(event) => setEscalationReason(event.target.value)}
                placeholder="e.g. Customer disputes loan terms; needs supervisor decision."
                className="mt-1.5 w-full rounded-lg border border-violet-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={submitEscalation}
                  disabled={!escalationReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <AlertTriangle size={13} /> Escalate to management
                </button>
                <button
                  type="button"
                  onClick={() => setShowEscalate(false)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {caseItem.status === 'Escalated' && caseItem.escalationReason && (
            <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
              <span className="font-semibold">Escalation reason:</span> {caseItem.escalationReason}
            </p>
          )}
        </div>

        {/* Admin-only reassignment */}
        {viewerRole === 'admin' && agents.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
            <div className="min-w-48 flex-1">
              <label htmlFor="reassign-select" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Assign / reassign to agent
              </label>
              <select
                id="reassign-select"
                value={reassignTo}
                onChange={(event) => setReassignTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Select an agent…</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.id} — {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!reassignTo}
              onClick={() => {
                const agent = agents.find((item) => item.id === reassignTo);
                if (agent) onAssign(agent.id, agent.name);
                setReassignTo('');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <UserRoundCheck size={14} /> Assign
            </button>
          </div>
        )}

        {/* Agent self-claim for unassigned cases */}
        {viewerRole === 'agent' && !caseItem.assignedAgentId && (
          <button
            type="button"
            onClick={() => onAssign(currentUserId, currentUserName)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          >
            <UserRoundCheck size={14} /> Claim this case
          </button>
        )}

        {/* Reply composer */}
        {isResolved ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> This case is resolved and read-only.
          </p>
        ) : (
          <div>
            <textarea
              aria-label={noteMode ? 'Internal note' : 'Reply to customer'}
              rows={3}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={noteMode ? 'Write an internal note (staff only, never shown to the customer)…' : 'Type your reply to the customer…'}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={noteMode}
                    onChange={(event) => setNoteMode(event.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-300"
                  />
                  Internal note instead of reply
                </label>
                {!noteMode && caseItem.customerId && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={sendAsWhatsApp}
                      onChange={(event) => setSendAsWhatsApp(event.target.checked)}
                      className="rounded border-slate-300 text-green-600 focus:ring-green-300"
                    />
                    <MessageCircle size={13} className="text-green-600" /> Also send as WhatsApp message
                  </label>
                )}
              </div>
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyText.trim() || isSendingWhatsApp}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  noteMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-500 hover:bg-brand-600'
                }`}
              >
                <Send size={14} /> {noteMode ? 'Add Note' : isSendingWhatsApp ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
            {whatsAppStatus && (
              <p className={`mt-2 text-xs ${whatsAppStatus.ok ? 'text-green-700' : 'text-red-600'}`} role={whatsAppStatus.ok ? 'status' : 'alert'}>
                {whatsAppStatus.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`truncate text-sm font-medium text-slate-800 ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}

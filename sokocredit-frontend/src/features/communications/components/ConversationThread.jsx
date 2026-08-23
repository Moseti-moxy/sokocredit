import { Lock } from 'lucide-react';
import { timeAgo } from '../../../utils/timeAgo';

// Chat-bubble message thread (WhatsApp-style) shared by the customer
// conversation view, agent case panel, and admin oversight panel.
//
// viewerIsStaff controls visibility: internal notes are rendered only for
// staff viewers and never reach the customer's Messages page.
export default function ConversationThread({ messages, viewerIsStaff }) {
  const visible = viewerIsStaff ? messages : messages.filter((message) => !message.internal);

  if (visible.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No messages yet.</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((message, index) => {
        if (message.internal) {
          return (
            <div key={index} className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Lock size={12} /> Internal note — hidden from customer
              </p>
              <p className="mt-1 text-sm text-amber-900">{message.text}</p>
              <p className="mt-1 text-[11px] text-amber-600">{message.senderName} · {timeAgo(message.at)}</p>
            </div>
          );
        }

        const isCustomer = message.sender === 'customer';
        const isAgentSide = isCustomer ? 'justify-start' : 'justify-end';
        const bubbleClass = isCustomer
          ? 'bg-white border border-slate-200 text-slate-800'
          : 'bg-brand-500 text-white';

        return (
          <div key={index} className={`flex ${isAgentSide}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${bubbleClass}`}>
              {!isCustomer && (
                <p className="mb-0.5 text-[11px] font-semibold opacity-90">{message.senderName}</p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
              <p className={`mt-1 text-right text-[11px] ${isCustomer ? 'text-slate-400' : 'text-brand-100'}`}>
                {timeAgo(message.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { KeyRound, X } from 'lucide-react';

// A production reset must use a verified email/SMS challenge and an expiring
// one-time token. Until that delivery service is configured, do not pretend a
// browser-only lookup can reset a real account.
export default function ForgotPinModal({ portal, onClose }) {
  const credential = portal === 'staff' ? 'password' : 'PIN';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="forgot-pin-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-brand-600" />
            <h2 id="forgot-pin-title" className="font-display text-lg font-semibold text-slate-900">Reset {credential}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <p className="mt-4 text-sm text-slate-600">For your security, account resets are verified by SokoCredit Support. Contact the support team using your registered {portal === 'staff' ? 'email address' : 'phone number or email address'} to begin the process.</p>
        <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Do not share your current {credential} or one-time verification codes with anyone.</p>
        <button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Return to sign in</button>
      </div>
    </div>
  );
}

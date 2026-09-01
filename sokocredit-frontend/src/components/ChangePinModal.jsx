import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { pinError } from '../utils/pin';

// Changes credentials through the authenticated API. Customer accounts use a
// short numeric PIN; staff accounts use a normal password.
export default function ChangePinModal({ role, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isCustomer = role === 'customer';
  const credentialLabel = isCustomer ? 'PIN' : 'password';

  async function submit(event) {
    event.preventDefault();
    if (newPin !== confirmPin) { setError(`New ${credentialLabel}s do not match.`); return; }
    if (isCustomer) {
      const issue = pinError(newPin);
      if (issue) { setError(issue); return; }
    } else if (newPin.length < 8) {
      setError('New password must be at least 8 characters.'); return;
    }
    setIsSaving(true); setError('');
    try {
      await apiClient.patch(isCustomer ? '/customer-auth/me/pin' : '/users/me/password', isCustomer
        ? { currentPin, newPin }
        : { currentPassword: currentPin, newPassword: newPin });
      setDone(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error || `Unable to update your ${credentialLabel}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="change-pin-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-brand-600" />
            <h2 id="change-pin-title" className="font-display text-lg font-semibold text-slate-900">Change {isCustomer ? 'PIN' : 'password'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {done ? (
          <div className="mt-4 grid gap-3">
            <p role="status" className="text-sm text-brand-700">Your {credentialLabel} has been updated.</p>
            <button type="button" onClick={onClose} className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <input autoFocus type="password" inputMode={isCustomer ? 'numeric' : undefined} className="app-field h-11 px-3" value={currentPin} onChange={(event) => setCurrentPin(isCustomer ? event.target.value.replace(/\D/g, '') : event.target.value)} placeholder={`Current ${credentialLabel}`} maxLength={isCustomer ? 8 : undefined} required />
            <input type="password" inputMode={isCustomer ? 'numeric' : undefined} className="app-field h-11 px-3" value={newPin} onChange={(event) => setNewPin(isCustomer ? event.target.value.replace(/\D/g, '') : event.target.value)} placeholder={isCustomer ? 'New PIN (4–8 digits)' : 'New password (8+ characters)'} maxLength={isCustomer ? 8 : undefined} required />
            <input type="password" inputMode={isCustomer ? 'numeric' : undefined} className="app-field h-11 px-3" value={confirmPin} onChange={(event) => setConfirmPin(isCustomer ? event.target.value.replace(/\D/g, '') : event.target.value)} placeholder={`Confirm new ${credentialLabel}`} maxLength={isCustomer ? 8 : undefined} required />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={isSaving} className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Updating…' : `Update ${credentialLabel}`}</button>
          </form>
        )}
      </div>
    </div>
  );
}

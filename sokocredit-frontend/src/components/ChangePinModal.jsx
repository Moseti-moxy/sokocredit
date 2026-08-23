import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { findMockUser, setUserPassword } from '../data/mockAuth';
import { pinError } from '../utils/pin';

// Lets any signed-in user (customer or staff) set a new PIN from within the
// app, without going through the "Forgot PIN" identity-verification flow.
export default function ChangePinModal({ user, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function submit(event) {
    event.preventDefault();
    if (!findMockUser(user.identifier, currentPin)) { setError('Your current PIN is incorrect.'); return; }
    if (newPin !== confirmPin) { setError('New PINs do not match.'); return; }
    const issue = pinError(newPin);
    if (issue) { setError(issue); return; }
    setUserPassword(user.id, newPin);
    setError(''); setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="change-pin-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-brand-600" />
            <h2 id="change-pin-title" className="font-display text-lg font-semibold text-slate-900">Change PIN</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {done ? (
          <div className="mt-4 grid gap-3">
            <p role="status" className="text-sm text-brand-700">Your PIN has been updated.</p>
            <button type="button" onClick={onClose} className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <input autoFocus type="password" inputMode="numeric" className="app-field h-11 px-3" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))} placeholder="Current PIN" maxLength={8} required />
            <input type="password" inputMode="numeric" className="app-field h-11 px-3" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))} placeholder="New PIN (4–8 digits)" maxLength={8} required />
            <input type="password" inputMode="numeric" className="app-field h-11 px-3" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="Confirm new PIN" maxLength={8} required />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Update PIN</button>
          </form>
        )}
      </div>
    </div>
  );
}

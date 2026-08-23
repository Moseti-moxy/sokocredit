import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { findAccountByIdentifier, setUserPassword } from '../data/mockAuth';
import { pinError } from '../utils/pin';

// Self-service PIN reset for the mock-auth demo: identify the account, prove
// ownership with whichever of {identifier, email} was not already given
// (every account has both), then set a new PIN. No email/SMS delivery exists
// yet, so this two-factor check stands in for it.
export default function ForgotPinModal({ portal, onClose }) {
  const [step, setStep] = useState('identify');
  const [identifierInput, setIdentifierInput] = useState('');
  const [match, setMatch] = useState(null);
  const [verifyValue, setVerifyValue] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  function submitIdentify(event) {
    event.preventDefault();
    const result = findAccountByIdentifier(identifierInput);
    if (!result) { setError('We could not find an account with those details.'); return; }
    const isAccountCustomer = result.account.role === 'customer';
    if (portal === 'customer' && !isAccountCustomer) { setError('That looks like a staff account. Use the staff sign-in page to reset its PIN.'); return; }
    if (portal === 'staff' && isAccountCustomer) { setError('That looks like a customer account. Use the customer sign-in page to reset its PIN.'); return; }
    setError(''); setMatch(result); setStep('verify');
  }

  function submitVerify(event) {
    event.preventDefault();
    const expected = match.matchedBy === 'identifier' ? match.account.email : match.account.identifier;
    if (!expected || verifyValue.trim().toLowerCase() !== expected.trim().toLowerCase()) {
      setError('That does not match our records.'); return;
    }
    setError(''); setStep('reset');
  }

  function submitReset(event) {
    event.preventDefault();
    if (newPin !== confirmPin) { setError('PINs do not match.'); return; }
    const issue = pinError(newPin);
    if (issue) { setError(issue); return; }
    setUserPassword(match.account.id, newPin);
    setError(''); setStep('done');
  }

  const identifierFieldLabel = match?.account.role === 'customer' ? 'National ID number' : 'Staff ID';
  const verifyLabel = match?.matchedBy === 'identifier' ? 'registered email' : identifierFieldLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="forgot-pin-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-brand-600" />
            <h2 id="forgot-pin-title" className="font-display text-lg font-semibold text-slate-900">Reset your PIN</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {step === 'identify' && (
          <form onSubmit={submitIdentify} className="mt-4 grid gap-3">
            <p className="text-sm text-slate-500">Enter {portal === 'staff' ? 'your registered email' : 'your registered email or National ID number'} to look up your account.</p>
            <input autoFocus className="app-field h-11 px-3" value={identifierInput} onChange={(event) => setIdentifierInput(event.target.value)} placeholder={portal === 'staff' ? 'name@sokocredit.co.ke' : 'your@email.com or 29481029'} required />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Continue</button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={submitVerify} className="mt-4 grid gap-3">
            <p className="text-sm text-slate-500">Confirm your {verifyLabel} to verify it's you.</p>
            <input autoFocus className="app-field h-11 px-3" value={verifyValue} onChange={(event) => setVerifyValue(event.target.value)} placeholder={verifyLabel} required />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Verify</button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={submitReset} className="mt-4 grid gap-3">
            <p className="text-sm text-slate-500">Choose a new PIN for {match.account.name}.</p>
            <input autoFocus type="password" inputMode="numeric" className="app-field h-11 px-3" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))} placeholder="New PIN (4–8 digits)" maxLength={8} required />
            <input type="password" inputMode="numeric" className="app-field h-11 px-3" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="Confirm new PIN" maxLength={8} required />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Set new PIN</button>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-4 grid gap-3">
            <p role="status" className="text-sm text-brand-700">Your PIN has been reset. You can now sign in with your new PIN.</p>
            <button type="button" onClick={onClose} className="h-11 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Return to sign in</button>
          </div>
        )}
      </div>
    </div>
  );
}

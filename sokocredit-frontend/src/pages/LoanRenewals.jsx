import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { formatKES } from '../utils/format';
import { getRenewalSuggestions, requestLoanRenewal } from '../features/loans/loanRenewalApi';

export default function LoanRenewals() {
  const [renewals, setRenewals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getRenewalSuggestions()
      .then(setRenewals)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load renewal suggestions.'))
      .finally(() => setIsLoading(false));
  }, []);

  async function processRenewal(suggestion) {
    if (!suggestion.lastLoanId) return;
    setProcessingId(suggestion.customerId);
    setError('');
    try {
      await requestLoanRenewal(suggestion.lastLoanId, {});
      setRenewals((current) => current.filter((item) => item.customerId !== suggestion.customerId));
      setNotice(`Renewal for ${suggestion.customerName} has been submitted for disbursement.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process the renewal.');
    } finally {
      setProcessingId(null);
    }
  }

  const avgScore = renewals.length
    ? Math.round(renewals.reduce((sum, r) => sum + r.creditScore, 0) / renewals.length)
    : null;

  return (
    <AppShell title="Loan Renewals" subtitle="Renewal suggestions for customers whose repayment history qualifies them.">
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Eligible for Renewal</p>
          <p className="font-display text-2xl font-semibold text-green-600">{renewals.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Completed Loans (avg)</p>
          <p className="font-display text-2xl font-semibold text-slate-900">
            {renewals.length ? Math.round(renewals.reduce((sum, r) => sum + r.completedLoans, 0) / renewals.length) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Avg Credit Score</p>
          <p className="font-display text-2xl font-semibold text-blue-600">{avgScore ?? '—'}</p>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {isLoading && (
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading renewal suggestions…</p>
      )}

      <div className="space-y-4">
        {renewals.map((renewal) => (
          <div key={renewal.customerId} className="rounded-2xl border border-brand-100 bg-white p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{renewal.customerName}</h3>
                <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> Eligible
                </span>
              </div>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                Score {renewal.creditScore} · {renewal.rating}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 pb-4 border-b border-brand-100">
              <div>
                <p className="text-xs text-slate-500 mb-1">Completed Loans</p>
                <p className="font-semibold text-slate-900">{renewal.completedLoans}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Prior Loan</p>
                <p className="font-mono text-xs font-semibold text-slate-900">{renewal.lastLoanId ? renewal.lastLoanId.slice(0, 8) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Rating</p>
                <p className="font-semibold text-slate-900">{renewal.rating}</p>
              </div>
            </div>

            {renewal.suggestedAmount != null && (
              <div className="bg-brand-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-600 mb-1">Suggested Renewal Amount (110% of prior loan)</p>
                <p className="font-display text-lg font-semibold text-brand-700">{formatKES(renewal.suggestedAmount)}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => processRenewal(renewal)}
              disabled={processingId === renewal.customerId || !renewal.lastLoanId}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              {processingId === renewal.customerId ? 'Processing…' : 'Process Renewal'}
            </button>
          </div>
        ))}
        {!renewals.length && !isLoading && (
          <p className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-sm text-slate-500">No customers currently qualify for a renewal.</p>
        )}
      </div>
    </AppShell>
  );
}

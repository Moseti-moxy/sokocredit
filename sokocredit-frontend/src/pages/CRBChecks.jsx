import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import CustomerPicker from '../components/CustomerPicker';
import { getCreditReport } from '../features/customers/api/crbApi';

export default function CRBChecks() {
  const [customer, setCustomer] = useState(null);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function runCheck(selected) {
    setCustomer(selected);
    setReport(null);
    setError('');
    if (!selected) return;
    setIsLoading(true);
    try {
      const result = await getCreditReport(selected.id);
      if (result.unavailable) {
        setError('Backend unreachable. Try again once the API is reachable.');
      } else {
        setReport(result);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to run the credit check.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="CRB Credit Checks" subtitle="Internal repayment history plus a bureau credit check for a selected customer.">
      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Select a customer</p>
        <CustomerPicker selected={customer} onSelect={runCheck} />
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <Loader2 size={14} className="animate-spin" /> Running credit check…
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {report && <Report customer={customer} report={report} onClose={() => setReport(null)} />}
    </AppShell>
  );
}

function Detail({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-900">{value}</p></div>;
}

function Report({ customer, report, onClose }) {
  const { external, accounts, outstanding, latePayments, summary } = report;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="crb-report-title">
      <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="crb-report-title" className="font-display text-xl font-semibold text-slate-900">Credit Report</h2>
            <p className="mt-1 text-sm text-slate-500">{customer.name} · {customer.nationalId}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close credit report" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Detail label="Loans considered" value={accounts} />
          <Detail label="Outstanding" value={`KES ${outstanding.toLocaleString('en-KE')}`} />
          <Detail label="Late payments" value={latePayments} />
          <Detail label="Internal rating" value={report.internal.rating} />
        </div>

        <div className="mt-5 rounded-xl bg-brand-50 p-4">
          <p className="text-xs font-medium uppercase text-brand-700">Internal summary</p>
          <p className="mt-1 text-sm text-slate-700">{summary}</p>
        </div>

        <div className="mt-5 border-t border-brand-100 pt-4 text-sm">
          <p className="font-semibold text-slate-900">Bureau check (external)</p>
          {external.available ? (
            <div className="mt-2 flex items-center gap-2 text-green-700">
              <CheckCircle size={14} /> Score {external.score} · {external.rating}
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2 text-orange-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {external.reason}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Building2, AlertCircle, Loader2, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import CustomerPicker from '../components/CustomerPicker';
import { checkBusinessRegistry } from '../features/customers/api/businessRegistryApi';

export default function BusinessRegistry() {
  const [customer, setCustomer] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function runCheck(selected) {
    setCustomer(selected);
    setLookup(null);
    setError('');
    if (!selected) return;
    setIsLoading(true);
    try {
      const result = await checkBusinessRegistry(selected.id);
      setLookup(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check the business registry.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Business Registry" subtitle="Look up a customer's business registration record with Kenya's business registry (eCitizen/BRS).">
      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Select a customer</p>
        <CustomerPicker selected={customer} onSelect={runCheck} />
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <Loader2 size={14} className="animate-spin" /> Checking business registry…
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {lookup && <Result customer={customer} lookup={lookup} onClose={() => setLookup(null)} />}
    </AppShell>
  );
}

function Result({ customer, lookup, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-brand-600" />
            <h2 className="font-display text-xl font-semibold text-slate-900">{customer.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>

        {lookup.available ? (
          lookup.result ? (
            <pre className="overflow-x-auto rounded-xl bg-brand-50 p-4 text-xs text-slate-700">{JSON.stringify(lookup.result, null, 2)}</pre>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
              <AlertCircle size={14} /> No business registry record was found for this registration number.
            </p>
          )
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {lookup.reason}
          </p>
        )}
      </section>
    </div>
  );
}

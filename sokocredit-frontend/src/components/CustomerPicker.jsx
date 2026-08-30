import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchCustomers } from '../features/customers/api/customersApi';

// Search-as-you-type combobox over the real customer directory. Used by pages
// that run a per-customer backend check (CRB, business registry, inventory
// financing) instead of the free-text search fields those pages used to have.
export default function CustomerPicker({ selected, onSelect, placeholder = 'Search by name, phone, or National ID…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(true);
      fetchCustomers({ search: query.trim() })
        .then((customers) => { if (!cancelled) setResults(customers); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{selected.name}</p>
          <p className="truncate text-xs text-slate-500">{selected.phone} · {selected.nationalId}</p>
        </div>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(''); }}
          aria-label="Clear selected customer"
          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-brand-100 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      {isOpen && query.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-brand-100 bg-white shadow-lg">
          {isLoading && <p className="px-3 py-2.5 text-sm text-slate-500">Searching…</p>}
          {!isLoading && results.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-slate-500">No customers match "{query}".</p>
          )}
          {!isLoading && results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onSelect(customer); setQuery(''); setIsOpen(false); }}
              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-brand-50"
            >
              <span className="font-medium text-slate-900">{customer.name}</span>
              <span className="ml-2 text-xs text-slate-500">{customer.phone} · {customer.nationalId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

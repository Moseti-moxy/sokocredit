import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { addCustomer } from '../features/customers/customersSlice';

const initialForm = { name: '', business: '', market: 'Gikomba Market', location: '' };

export default function NewCustomer() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const update = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.business.trim() || !form.market.trim()) {
      setError('Enter the customer name, business type, and market.');
      return;
    }
    dispatch(addCustomer({
      id: `SC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      name: form.name.trim(),
      business: form.business.trim(),
      market: form.market,
      location: form.location.trim() || form.market,
      status: 'Active',
      joined: new Date().toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalLoans: 0,
      defaultRate: 0,
      creditScore: 0,
      paymentHistory: [],
    }));
    navigate('/customers');
  };

  return (
    <AppShell title="Add Customer" subtitle="Create a field trader profile.">
      <div className="max-w-2xl app-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">New customer</h2>
            <p className="mt-1 text-sm text-slate-500">Add the trader details needed to begin a loan application.</p>
          </div>
          <Link to="/customers" className="text-sm font-medium text-brand-700 hover:underline">Cancel</Link>
        </div>
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">Full name
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="app-field h-11 px-3" placeholder="e.g. Jane Doe" autoFocus />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">Business type
            <input value={form.business} onChange={(e) => update('business', e.target.value)} className="app-field h-11 px-3" placeholder="e.g. Fresh Produce" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">Market
            <select value={form.market} onChange={(e) => update('market', e.target.value)} className="app-field h-11 px-3">
              <option>Gikomba Market</option><option>Muthurwa Market</option><option>City Park Market</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">Business location <span className="font-normal text-slate-400">(optional)</span>
            <input value={form.location} onChange={(e) => update('location', e.target.value)} className="app-field h-11 px-3" placeholder="e.g. Stall #42, Pumwani Road" />
          </label>
          {error && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
            <Link to="/customers" className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50">Cancel</Link>
            <button type="submit" className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Create customer</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

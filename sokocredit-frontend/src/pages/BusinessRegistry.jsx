import { useState } from 'react';
import { Building2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import AppShell from '../components/AppShell';

export default function BusinessRegistry() {
  const [businesses] = useState([
    { id: 1, name: 'Wanjiru Market Traders', regNumber: 'BRN-2024-001', owner: 'Jane Wanjiru', type: 'Sole Proprietor', status: 'Verified', registered: '2023-05-15', synced: true },
    { id: 2, name: 'Otieno & Partners Ltd', regNumber: 'BRN-2024-002', owner: 'David Otieno', type: 'Partnership', status: 'Verified', registered: '2022-08-22', synced: true },
    { id: 3, name: 'Kipchoge Enterprises', regNumber: 'BRN-2024-003', owner: 'Mary Kipchoge', type: 'Sole Proprietor', status: 'Pending', registered: '2025-02-10', synced: false },
  ]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const matchingBusinesses = businesses.filter((business) => `${business.name} ${business.regNumber}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell title="Business Registry" subtitle="Verify and link business registrations with Kenya's business registry systems.">
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Registered</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{businesses.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Verified</p>
          <p className="font-display text-2xl font-semibold text-green-600">{businesses.filter(b => b.status === 'Verified').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Pending Verification</p>
          <p className="font-display text-2xl font-semibold text-orange-600">{businesses.filter(b => b.status === 'Pending').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={() => setNotice('Business registration form is ready. Enter a registration number in the search field to verify an existing business.')} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
            <Building2 size={16} /> Register Business
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-5 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by business name or registration number..." className="w-full rounded-lg border border-brand-100 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <button type="button" onClick={() => setNotice(query ? `${matchingBusinesses.length} matching business${matchingBusinesses.length === 1 ? '' : 'es'} found.` : 'Enter a business name or registration number to verify it.')} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            Verify
          </button>
        </div>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}

      <div className="space-y-4">
        {matchingBusinesses.map((business) => (
          <div key={business.id} className={`rounded-2xl border p-5 ${business.status === 'Verified' ? 'bg-white border-brand-100' : 'bg-orange-50/30 border-orange-100'}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={20} className="text-brand-600" />
                  <h3 className="font-semibold text-slate-900">{business.name}</h3>
                  {business.status === 'Verified' ? (
                    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      <AlertCircle size={12} /> Pending
                    </span>
                  )}
                  {business.synced && <span className="text-xs text-green-600">✓ Synced</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-brand-100">
              <div>
                <p className="text-xs text-slate-500 mb-1">Registration Number</p>
                <p className="font-semibold text-slate-900">{business.regNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Owner</p>
                <p className="font-semibold text-slate-900">{business.owner}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Business Type</p>
                <p className="font-semibold text-slate-900">{business.type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Registered</p>
                <p className="font-semibold text-slate-900">{business.registered}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setNotice(`${business.name} (${business.regNumber}) is ${business.status.toLowerCase()}.`)} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                View Details
              </button>
              <button type="button" onClick={() => setNotice(`${business.name} has been selected to link to a loan.`)} className="px-4 py-2.5 border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50">
                Link to Loan
              </button>
            </div>
          </div>
        ))}
        {!matchingBusinesses.length && <p className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-sm text-slate-500">No businesses match your search.</p>}
      </div>
    </AppShell>
  );
}

import { useState } from 'react';
import { CheckCircle, Search, AlertCircle, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';

export default function CRBChecks() {
  const [checks] = useState([
    { id: 1, name: 'Jane Wanjiru', idNumber: '12345678', score: 480, status: 'Clear', date: '2025-08-20', synced: true },
    { id: 2, name: 'David Otieno', idNumber: '87654321', score: 320, status: 'Caution', date: '2025-08-19', synced: true },
    { id: 3, name: 'Mary Kipchoge', idNumber: '45678912', score: 590, status: 'Clear', date: '2025-08-18', synced: true },
  ]);

  return (
    <AppShell title="CRB Credit Checks" subtitle="Real-time credit verification with Kenya's Credit Reference Bureau.">
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Checks</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{checks.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Clear Status</p>
          <p className="font-display text-2xl font-semibold text-green-600">{checks.filter(c => c.status === 'Clear').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Caution Status</p>
          <p className="font-display text-2xl font-semibold text-orange-600">{checks.filter(c => c.status === 'Caution').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-5 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search by name or ID number..." className="w-full rounded-lg border border-brand-100 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <button className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            New Check
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.id} className="bg-white rounded-2xl border border-brand-100 p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900">{check.name}</h3>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    check.status === 'Clear' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-orange-50 text-orange-700'
                  }`}>
                    {check.status === 'Clear' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {check.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-3">ID: {check.idNumber}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Credit Score</p>
                    <p className="font-semibold text-slate-900">{check.score}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Last Checked</p>
                    <p className="font-semibold text-slate-900">{check.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CRB Status</p>
                    <p className="font-semibold text-green-600">✓ Synced</p>
                  </div>
                </div>
              </div>
              <button className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                View Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

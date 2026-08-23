import { Plus, Star, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import LanguageSettings from '../components/LanguageSettings';
import { fieldAgents, loanParameterDefaults, integrationStatus } from '../data/mockData';
import { formatKES } from '../utils/format';

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </span>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [parameters, setParameters] = useState({ standardInterestRate: loanParameterDefaults.standardInterestRate, maxLoanTermDays: loanParameterDefaults.maxLoanTermDays });
  const [notice, setNotice] = useState('');
  return (
    <AppShell title="System Settings & Agents" subtitle="Manage active agents and monitor performance metrics.">
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-slate-900">Field Agents</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage active agents and monitor performance metrics.</p>
            </div>
            <button type="button" onClick={() => navigate('/loan-officers')} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl px-3.5 py-2 shrink-0">
              <Plus size={15} /> New Agent
            </button>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {fieldAgents.map((a) => (
              <div key={a.id} className="border border-brand-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-medium text-sm text-slate-900">{a.name}</p>
                  <Stars rating={a.rating} />
                </div>
                <p className="text-xs text-brand-600 font-medium mb-1">{a.market}</p>
                <p className="text-sm text-slate-700">{formatKES(a.collectionsMtd)} <span className="text-xs text-slate-400">MTD</span></p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
                  <th className="py-2 font-medium">Agent Details</th>
                  <th className="py-2 font-medium">Market</th>
                  <th className="py-2 font-medium">Collections (MTD)</th>
                  <th className="py-2 font-medium">Rating</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fieldAgents.map((a) => (
                  <tr key={a.id} className="border-b border-brand-50 last:border-0">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.id}</p>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2 py-1 rounded-full">{a.market}</span>
                    </td>
                    <td className="py-3 text-slate-700">
                      {formatKES(a.collectionsMtd)}
                      {a.changePct ? <span className="text-brand-600 text-xs ml-1">+{a.changePct}%</span> : <span className="text-slate-400 text-xs ml-1">{a.note}</span>}
                    </td>
                    <td className="py-3"><Stars rating={a.rating} /></td>
                    <td className="py-3 text-slate-400">···</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => navigate('/loan-officers')} className="w-full text-center text-sm font-medium text-brand-600 py-3 hover:underline">
            View All 24 Agents
          </button>
        </div>

        <div className="space-y-5">
          <LanguageSettings />

          <div className="bg-white rounded-2xl border border-brand-100 p-5">
            <h2 className="font-display font-semibold text-slate-900 mb-4">Loan Parameter Defaults</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Standard Interest Rate (%)</label>
                <input
                  value={parameters.standardInterestRate}
                  onChange={(event) => setParameters((current) => ({ ...current, standardInterestRate: event.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Max Loan Term (Days)</label>
                <select
                  value={parameters.maxLoanTermDays}
                  onChange={(event) => setParameters((current) => ({ ...current, maxLoanTermDays: event.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
              </div>
              <button type="button" onClick={() => setNotice(`Loan parameters saved: ${parameters.standardInterestRate}% interest, ${parameters.maxLoanTermDays}-day maximum term.`)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl py-2.5 text-sm">
                Save Parameters
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-brand-100 p-5">
            <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Link2 size={16} className="text-brand-500" /> Integration Status
            </h2>
            <div className="space-y-2">
              {integrationStatus.map((i) => (
                <div key={i.id} className="flex items-center justify-between bg-brand-50/40 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium text-slate-700">{i.label}</span>
                  <span className="text-xs font-medium text-brand-600">● {i.status}</span>
                </div>
              ))}
            </div>
          </div>
          {notice && <p role="status" className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{notice}</p>}
        </div>
      </div>
    </AppShell>
  );
}

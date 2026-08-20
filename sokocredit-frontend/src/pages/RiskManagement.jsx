import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import AppShell from '../components/AppShell';
import { creditScoreDistribution, delinquencyTrends, crbIntegrations, highRiskAccounts } from '../data/mockData';
import { formatKES } from '../utils/format';

const statusStyle = {
  Active: 'bg-brand-50 text-brand-700',
  'Sync Error': 'bg-red-50 text-red-600',
};

export default function RiskManagement() {
  return (
    <AppShell title="Risk Management Dashboard" subtitle="Portfolio health and credit scoring overview.">
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-slate-900">Credit Score Distribution</h2>
            <a href="#" className="text-xs font-medium text-brand-600 hover:underline">View Report</a>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creditScoreDistribution} margin={{ left: -10 }}>
                <CartesianGrid stroke="#eef3ec" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Bar dataKey="count" fill="#67a852" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">CRB Integration</h2>
          <p className="text-xs text-slate-500 mb-4">Real-time sync status with regional Credit Reference Bureaus.</p>
          <div className="space-y-2 mb-4">
            {crbIntegrations.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-brand-50/40 rounded-lg px-3 py-2.5">
                <span className="text-sm font-medium text-slate-700">{c.label}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle[c.status] || 'bg-slate-100 text-slate-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
          <button className="w-full border border-brand-200 text-brand-700 font-medium rounded-xl py-2.5 text-sm hover:bg-brand-50">
            Manage Integrations
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Delinquency Trends</h2>
          <div className="space-y-4">
            {delinquencyTrends.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{d.label}</span>
                  <span className="font-medium text-slate-900">{d.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-brand-50 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, d.pct * 4)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-slate-900">High-Risk Account Alerts</h2>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {highRiskAccounts.map((a) => (
              <div key={a.id} className="border border-red-100 bg-red-50/40 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{a.id}</span>
                  <a href="#" className="text-xs font-medium text-brand-600">Review</a>
                </div>
                <p className="text-xs text-red-600 mb-1">{a.factor}</p>
                <p className="text-xs text-slate-500">Exposure: {formatKES(a.exposure)}</p>
              </div>
            ))}
          </div>
          {/* Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
                  <th className="py-2 font-medium">Trader ID</th>
                  <th className="py-2 font-medium">Risk Factor</th>
                  <th className="py-2 font-medium">Exposure</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {highRiskAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-brand-50 last:border-0">
                    <td className="py-2.5 font-medium text-slate-800">{a.id}</td>
                    <td className="py-2.5 text-red-600">{a.factor}</td>
                    <td className="py-2.5 text-slate-600">{formatKES(a.exposure)}</td>
                    <td className="py-2.5"><a href="#" className="text-brand-600 font-medium hover:underline">Review</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

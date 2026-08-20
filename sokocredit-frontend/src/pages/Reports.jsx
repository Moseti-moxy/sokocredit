import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Download, AlertTriangle, Filter } from 'lucide-react';
import AppShell from '../components/AppShell';
import {
  reportFilterOptions,
  defaultRateByMarket,
  paymentPatternTrend,
  highRiskAccounts,
} from '../data/mockData';
import { formatKES } from '../utils/format';

// Builds a CSV client-side from whatever rows are currently on screen. Once
// the Flask endpoint for report generation exists, swap this for a POST to
// e.g. /reports/export and download the file it returns instead.
function exportRowsAsCsv(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => row[h]).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [officer, setOfficer] = useState(reportFilterOptions.loanOfficers[0]);
  const [location, setLocation] = useState(reportFilterOptions.locations[0]);
  const [dateRange, setDateRange] = useState('30d');

  const filteredRows = useMemo(() => {
    return defaultRateByMarket.filter((row) => {
      const matchesOfficer = officer === 'All Officers' || row.officer === officer;
      const matchesLocation = location === 'All Markets' || row.location === location;
      return matchesOfficer && matchesLocation;
    });
  }, [officer, location]);

  const avgDefaultRate = filteredRows.length
    ? (filteredRows.reduce((sum, r) => sum + r.defaultRate, 0) / filteredRows.length).toFixed(1)
    : '0.0';

  function handleExport() {
    exportRowsAsCsv(
      filteredRows.map((r) => ({
        location: r.location,
        officer: r.officer,
        loans: r.loans,
        default_rate_pct: r.defaultRate,
        at_risk_amount_kes: r.atRiskAmount,
      })),
      `default-rate-report-${dateRange}.csv`
    );
  }

  return (
    <AppShell title="Performance & Default Reports" subtitle="Filter portfolio performance by date range, officer, and market.">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-brand-600" />
          <h2 className="font-display font-semibold text-slate-900">Report Filters</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="dateRange" className="block text-xs font-medium text-slate-500 mb-1.5">Date Range</label>
            <select
              id="dateRange"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
            </select>
          </div>
          <div>
            <label htmlFor="officer" className="block text-xs font-medium text-slate-500 mb-1.5">Loan Officer</label>
            <select
              id="officer"
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {reportFilterOptions.loanOfficers.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location" className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {reportFilterOptions.locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Default rate breakdown */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-semibold text-slate-900">Default Rate Breakdown</h2>
            <p className="text-xs text-slate-500">Avg. default rate for the current filter: {avgDefaultRate}%</p>
          </div>
          <button
            onClick={handleExport}
            disabled={!filteredRows.length}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div className="h-56 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredRows} margin={{ left: -10 }}>
              <CartesianGrid stroke="#eef3ec" vertical={false} />
              <XAxis dataKey="location" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="defaultRate" name="Default Rate" fill="#e07a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
                <th className="py-2 font-medium">Market</th>
                <th className="py-2 font-medium">Loan Officer</th>
                <th className="py-2 font-medium text-right">Loans</th>
                <th className="py-2 font-medium text-right">Default Rate</th>
                <th className="py-2 font-medium text-right">At-Risk Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((r) => (
                  <tr key={r.location} className="border-b border-brand-50 last:border-0">
                    <td className="py-2.5 font-medium text-slate-800">{r.location}</td>
                    <td className="py-2.5 text-slate-500">{r.officer}</td>
                    <td className="py-2.5 text-right text-slate-600">{r.loans}</td>
                    <td className={`py-2.5 text-right font-medium ${r.defaultRate >= 6 ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.defaultRate}%
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{formatKES(r.atRiskAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                    No results for this filter combination.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment pattern + high-risk table */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-1">Payment Pattern</h2>
          <p className="text-xs text-slate-500 mb-4">On-time vs. late repayments, week over week.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentPatternTrend} margin={{ left: -10 }}>
                <CartesianGrid stroke="#eef3ec" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="onTimePct" name="On-Time" stroke="#3f7d2e" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="latePct" name="Late" stroke="#e07a5f" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk data shape shared with Dev 3's Risk Management page — same
            `highRiskAccounts` source so both views stay in sync. */}
        <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-1">High-Risk Borrowers</h2>
          <p className="text-xs text-slate-500 mb-4">Accounts flagged for elevated risk this period.</p>
          <div className="space-y-2">
            {highRiskAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-red-50/60 rounded-xl p-3">
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{a.id}</p>
                  <p className="text-xs text-red-600 truncate">{a.factor}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">{formatKES(a.exposure)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

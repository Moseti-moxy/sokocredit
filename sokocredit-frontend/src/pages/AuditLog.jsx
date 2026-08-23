import { Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { auditLog } from '../data/mockData';

export default function AuditLog() {
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [eventFilter, setEventFilter] = useState('All Events');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 4;
  const filteredLogs = useMemo(() => auditLog.filter((log) => `${log.user} ${log.action} ${log.status} ${log.ip}`.toLowerCase().includes(query.toLowerCase()) && (roleFilter === 'All Roles' || log.user.toLowerCase().includes(roleFilter.toLowerCase())) && (eventFilter === 'All Events' || log.status === eventFilter)), [eventFilter, query, roleFilter]);
  const visibleLogs = filteredLogs.slice(page * pageSize, (page + 1) * pageSize);
  const exportCsv = () => {
    const rows = [['Timestamp', 'User / System', 'Action Type', 'Status', 'IP Address'], ...filteredLogs.map((log) => [log.timestamp, log.user, log.action, log.status, log.ip])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sokocredit-audit-log.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const cycle = (setter, values) => setter((current) => values[(values.indexOf(current) + 1) % values.length]);
  return (
    <AppShell title="Audit Log & Transaction History" subtitle="Comprehensive system record for administrative transparency and compliance.">
      <div className="flex items-center justify-between mb-4">
        <div />
        <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 border border-brand-200 text-brand-700 text-sm font-medium rounded-xl px-3.5 py-2">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <button type="button" onClick={() => setPage(0)} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          Last 30 Days <ChevronDown size={14} />
        </button>
        <button type="button" onClick={() => { cycle(setRoleFilter, ['All Roles', 'Admin', 'Agent']); setPage(0); }} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          {roleFilter} <ChevronDown size={14} />
        </button>
        <button type="button" onClick={() => { cycle(setEventFilter, ['All Events', 'Success', 'Failed']); setPage(0); }} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          {eventFilter} <ChevronDown size={14} />
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          placeholder="Search logs..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {visibleLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-brand-100 p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-medium text-sm text-slate-900">{log.action}</p>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  log.status === 'Success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {log.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">{log.user}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>{log.timestamp}</span>
              <span>{log.ip}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-5 py-3 font-medium">User / System</th>
              <th className="px-5 py-3 font-medium">Action Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">IP Address</th>
              <th className="px-5 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((log) => (
              <tr key={log.id} className="border-b border-brand-50 last:border-0">
                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-5 py-3 text-slate-800">{log.user}</td>
                <td className="px-5 py-3 text-slate-600">{log.action}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      log.status === 'Success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{log.ip}</td>
                <td className="px-5 py-3"><ChevronRight size={16} className="text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Showing {filteredLogs.length ? page * pageSize + 1 : 0}-{Math.min((page + 1) * pageSize, filteredLogs.length)} of {filteredLogs.length} entries</span>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="px-3 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
          <button type="button" disabled={(page + 1) * pageSize >= filteredLogs.length} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>
    </AppShell>
  );
}

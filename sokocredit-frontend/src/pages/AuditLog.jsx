import { Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import AppShell from '../components/AppShell';
import { auditLog } from '../data/mockData';

export default function AuditLog() {
  return (
    <AppShell title="Audit Log & Transaction History" subtitle="Comprehensive system record for administrative transparency and compliance.">
      <div className="flex items-center justify-between mb-4">
        <div />
        <button className="flex items-center gap-1.5 border border-brand-200 text-brand-700 text-sm font-medium rounded-xl px-3.5 py-2">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <button className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          Last 30 Days <ChevronDown size={14} />
        </button>
        <button className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          All Roles <ChevronDown size={14} />
        </button>
        <button className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600">
          All Events <ChevronDown size={14} />
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search logs..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {auditLog.map((log) => (
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
            {auditLog.map((log) => (
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
        <span>Showing 1-4 of 1,245 entries</span>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-50">Prev</button>
          <button className="px-3 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-50">Next</button>
        </div>
      </div>
    </AppShell>
  );
}

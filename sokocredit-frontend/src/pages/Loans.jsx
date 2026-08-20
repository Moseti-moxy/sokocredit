import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Search, ChevronDown } from 'lucide-react';
import AppShell from '../components/AppShell';
import { formatKES } from '../utils/format';

const statusStyle = {
  'On Track': 'bg-brand-50 text-brand-700',
  'Overdue 14 Days': 'bg-red-50 text-red-600',
  'Due Tomorrow': 'bg-amber-50 text-amber-700',
};

function NewLoanForm() {
  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-5">
      <h2 className="font-display font-semibold text-slate-900 mb-4">New Loan</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Name</label>
          <input
            placeholder="e.g. Jane Doe"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount (KES)</label>
          <input
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Interest Rate (%)</label>
            <input
              placeholder="0.0"
              className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration (Months)</label>
            <select className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
              <option>1 Month</option>
              <option>3 Months</option>
              <option>6 Months</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl py-3 transition-colors"
        >
          + Create Loan
        </button>
      </form>
    </div>
  );
}

export default function Loans() {
  const { list } = useSelector((state) => state.loans);
  const [tab, setTab] = useState('All');

  const filtered = tab === 'All' ? list : list.filter((l) => l.status === tab);

  return (
    <AppShell title="Loan Management" subtitle="Create and track active loans for market traders.">
      <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-5">
        {/* Form: full width on mobile, first column on desktop */}
        <div className="order-2 lg:order-1">
          <NewLoanForm />
        </div>

        {/* Tracking */}
        <div className="order-1 lg:order-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h2 className="font-display font-semibold text-slate-900">Active Tracking</h2>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:hidden">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search customer..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-brand-100 text-sm"
                />
              </div>
              <button
                onClick={() => setTab('All')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  tab === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab('Overdue 14 Days')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  tab === 'Overdue 14 Days' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                }`}
              >
                Overdue (2)
              </button>
            </div>
          </div>

          {/* Mobile / tablet: stacked cards */}
          <div className="xl:hidden space-y-3">
            {filtered.map((loan) => (
              <div
                key={loan.id}
                className={`bg-white rounded-xl border p-4 ${
                  loan.status.startsWith('Overdue') ? 'border-red-200' : 'border-brand-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium shrink-0">
                      {loan.customer.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{loan.customer}</p>
                      <p className="text-xs text-slate-500 truncate">{loan.business} · {loan.id}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${statusStyle[loan.status] || 'bg-slate-100 text-slate-600'}`}>
                    {loan.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Repayment Progress</span>
                  <span>{loan.progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-brand-50 overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${loan.status.startsWith('Overdue') ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${loan.progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{formatKES(loan.paid)} Paid</span>
                  <span className="font-medium text-slate-700">{formatKES(loan.amount)} Total</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Due {loan.dueDate}</p>
              </div>
            ))}
          </div>

          {/* Desktop (xl+): table */}
          <div className="hidden xl:block bg-white rounded-2xl border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Next Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr key={loan.id} className="border-b border-brand-50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {loan.customer.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{loan.customer}</p>
                          <p className="text-xs text-slate-500">{loan.business} · {loan.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{formatKES(loan.amount)}</td>
                    <td className="px-5 py-3 w-40">
                      <div className="h-2 rounded-full bg-brand-50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${loan.status.startsWith('Overdue') ? 'bg-red-500' : 'bg-brand-500'}`}
                          style={{ width: `${loan.progressPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{loan.progressPct}%</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle[loan.status] || 'bg-slate-100 text-slate-600'}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{loan.dueDate}</td>
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

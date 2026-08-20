import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Search, AlertTriangle } from 'lucide-react';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import {
  analyticsSummary,
  monthlyFlow,
  performanceByCategory,
  defaultersAlert,
} from '../data/mockData';
import { formatCompactKES, formatKES } from '../utils/format';

export default function Analytics() {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [repayment, setRepayment] = useState({ borrower: '', amount: '', reference: '' });
  const [repaymentMessage, setRepaymentMessage] = useState('');
  const submitRepayment = (event) => {
    event.preventDefault();
    if (!repayment.borrower.trim() || Number(repayment.amount) <= 0 || (paymentMethod === 'M-Pesa' && !repayment.reference.trim())) {
      setRepaymentMessage('Enter a borrower, a valid amount, and an M-Pesa reference when applicable.'); return;
    }
    setRepaymentMessage(`Repayment of ${formatKES(Number(repayment.amount))} recorded via ${paymentMethod}.`);
    setRepayment({ borrower: '', amount: '', reference: '' });
  };
  return (
    <AppShell title="Analytics & Collections" subtitle="Review portfolio performance and log new repayments.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard
          label="Total Disbursed"
          value={formatCompactKES(analyticsSummary.totalDisbursed)}
          delta={`+${analyticsSummary.disbursedChangePct}%`}
        />
        <StatCard
          label="Total Collected"
          value={formatCompactKES(analyticsSummary.totalCollected)}
          delta={`+${analyticsSummary.collectedChangePct}%`}
        />
        <StatCard
          label="Active Loans"
          value={analyticsSummary.activeLoans}
          deltaLabel={`across ${analyticsSummary.activeLoanMarkets} markets`}
        />
        <StatCard
          label="PAR > 30 Days"
          value={`${analyticsSummary.parOver30}%`}
          delta="Watchlist"
          tone="danger"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-slate-900">Monthly Flow (YTD)</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" />Collected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />Disbursed</span>
              </div>
            </div>
            <div className="h-64 sm:h-72 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyFlow} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#eef3ec" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompactKES(v)}
                    width={54}
                  />
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Line type="monotone" dataKey="disbursed" stroke="#cbd5c8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="collected" stroke="#3f7d2e" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <h2 className="font-display font-semibold text-slate-900 mb-4">Performance by Category</h2>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={performanceByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {performanceByCategory.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {performanceByCategory.map((c) => (
                  <span key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <h2 className="font-display font-semibold text-slate-900 mb-4">Recent Defaulters Alert</h2>
              <div className="space-y-3">
                {defaultersAlert.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 bg-red-50/60 rounded-xl p-3">
                    <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-500 truncate">{d.business} · {d.daysOverdue} Days Overdue</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600 shrink-0">{formatKES(d.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Log repayment form */}
        <div className="bg-white rounded-2xl border border-brand-100 p-5 h-fit lg:sticky lg:top-20">
          <h2 className="font-display font-semibold text-slate-900 mb-1">Log Repayment</h2>
          <p className="text-xs text-slate-500 mb-4">Record a new collection from a borrower.</p>
          <form className="space-y-4" onSubmit={submitRepayment}>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Borrower ID or Name</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={repayment.borrower} onChange={(e) => setRepayment({ ...repayment, borrower: e.target.value })}
                  placeholder="Search borrower..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount Collected (KES)</label>
              <input
                value={repayment.amount} onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })} type="number" min="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'M-Pesa'].map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-2.5 rounded-lg text-sm font-medium ${paymentMethod === method ? 'bg-brand-500 text-white' : 'border border-brand-100 text-slate-600'}`}>{method}</button>)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">M-Pesa Reference Code</label>
              <input
                disabled={paymentMethod !== 'M-Pesa'} value={repayment.reference} onChange={(e) => setRepayment({ ...repayment, reference: e.target.value })}
                placeholder="E.G. QWE123RTY"
                className="w-full px-3 py-2.5 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl py-3 transition-colors"
            >
              Record Repayment
            </button>
            {repaymentMessage && <p role="status" className="text-xs text-brand-700">{repaymentMessage}</p>}
          </form>
        </div>
      </div>
    </AppShell>
  );
}

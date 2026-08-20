import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Wallet, Landmark, Target, UserPlus, Send } from 'lucide-react';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import CollectionTargets from '../components/CollectionTargets';
import { currentAgent, dashboardStats, recentActivity, portfolioTrend } from '../data/mockData';
import { formatKES, formatCompactKES } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agentName = user?.name || currentAgent.name;
  const agentMarket = user?.market || currentAgent.market;

  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const progressPct = Math.min(
    100,
    Math.round((dashboardStats.collectedToday / dashboardStats.todaysTarget) * 100)
  );

  return (
    <AppShell
      title={`Good morning, ${agentName.split(' ')[0]}`}
      subtitle={`${today} · ${agentMarket}`}
    >
      {/* Stat grid: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Portfolio"
          value={formatKES(dashboardStats.totalPortfolio)}
          delta={`+${dashboardStats.portfolioChangePct}%`}
          deltaLabel="this week"
          icon={Wallet}
        />
        <StatCard
          label="Active Loans"
          value={dashboardStats.activeLoans}
          deltaLabel={`across ${dashboardStats.marketsCovered} markets`}
          icon={Landmark}
        />
        <StatCard
          label="Today's Target"
          value={formatKES(dashboardStats.todaysTarget)}
          deltaLabel={`${progressPct}% progress`}
          icon={Target}
        />
        <StatCard
          label="Collected Today"
          value={formatKES(dashboardStats.collectedToday)}
          deltaLabel="as of 11:30 AM"
          icon={Wallet}
        />
      </div>

      {/* Portfolio trend: 8-week view of portfolio value vs. amount collected */}
      <section className="mt-6 bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-slate-900">Portfolio Trend</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" />Portfolio</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-200" />Collected</span>
          </div>
        </div>
        <div className="h-56 sm:h-64 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={portfolioTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3f7d2e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3f7d2e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef3ec" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactKES(v)}
                width={54}
              />
              <Tooltip formatter={(v) => formatKES(v)} />
              <Area type="monotone" dataKey="collected" stroke="#b9d9af" fill="#b9d9af" fillOpacity={0.4} strokeWidth={2} />
              <Area type="monotone" dataKey="portfolio" stroke="#3f7d2e" fill="url(#portfolioFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick actions: stack on mobile, side by side from sm up */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button onClick={() => navigate('/customers/new')} className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl px-4 py-3.5 sm:py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <UserPlus size={18} />
          New Customer
        </button>
        <button onClick={() => navigate('/loans?view=disburse')} className="flex-1 flex items-center justify-center gap-2 bg-white border border-brand-200 text-brand-700 font-medium rounded-xl px-4 py-3.5 sm:py-3 hover:bg-brand-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <Send size={18} />
          Disburse Loan
        </button>
      </div>

      <CollectionTargets />

      {/* Recent activity: card list on mobile, table from md up */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-slate-900">Recent Activity</h2>
          <Link to="/reports" className="text-sm font-medium text-brand-600 hover:underline">View All</Link>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-2">
          {recentActivity.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-brand-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium text-sm shrink-0">
                {item.customer.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-slate-900 truncate">{item.customer}</p>
                <p className="text-xs text-slate-500 truncate">{item.businessType} · {item.time}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${item.amount < 0 ? 'text-slate-900' : 'text-brand-600'}`}>
                  {item.amount < 0 ? '-' : '+'}{formatKES(Math.abs(item.amount))}
                </p>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    item.status === 'Completed'
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet/desktop: table */}
        <div className="hidden md:block bg-white rounded-2xl border border-brand-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Business Type</th>
                <th className="px-5 py-3 font-medium">Transaction</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((item) => (
                <tr key={item.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-5 py-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium">
                      {item.customer.charAt(0)}
                    </span>
                    {item.customer}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{item.businessType}</td>
                  <td className="px-5 py-3 capitalize text-slate-500">{item.type}</td>
                  <td className={`px-5 py-3 text-right font-medium ${item.amount < 0 ? 'text-slate-900' : 'text-brand-600'}`}>
                    {item.amount < 0 ? '-' : '+'}{formatKES(Math.abs(item.amount))}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{item.time}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.status === 'Completed'
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

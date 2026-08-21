import { ClipboardCheck, Users, Wallet } from 'lucide-react';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';

export default function LoanOfficerDashboard() {
  const { user } = useAuth();
  return <AppShell title={`Loan Officer workspace`} subtitle={`Welcome, ${user?.name || 'Loan Officer'}`}>
    <div className="grid sm:grid-cols-3 gap-4"><StatCard label="Assigned customers" value="24" deltaLabel="Across your portfolio" icon={Users} /><StatCard label="Applications to review" value="6" deltaLabel="Require action today" icon={ClipboardCheck} /><StatCard label="Repayments this week" value="KES 82,400" deltaLabel="Collection progress" icon={Wallet} /></div>
    <section className="mt-6 bg-white rounded-2xl border border-brand-100 p-5"><h2 className="font-display font-semibold text-slate-900">Today’s priorities</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>Review pending customer applications.</li><li>Follow up on scheduled repayments.</li><li>Update customer visit notes.</li></ul></section>
  </AppShell>;
}

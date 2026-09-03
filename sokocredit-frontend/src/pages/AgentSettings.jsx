import { UserRoundCog } from 'lucide-react';
import AppShell from '../components/AppShell';
import LanguageSettings from '../components/LanguageSettings';
import { useAuth } from '../hooks/useAuth';

export default function AgentSettings() {
  const { user } = useAuth();
  return <AppShell title="Agent Settings" subtitle="Manage your personal workspace preferences."><div className="grid gap-5 lg:grid-cols-2"><LanguageSettings /><section className="rounded-2xl border border-brand-100 bg-white p-5"><div className="mb-4 flex items-center gap-2"><UserRoundCog size={20} className="text-brand-600" /><h2 className="font-display font-semibold text-slate-900">Agent Profile</h2></div><p className="mb-4 text-sm text-slate-500">Your account details are managed by an administrator.</p><div className="space-y-2 text-sm"><p><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{user?.name || '—'}</span></p><p><span className="text-slate-500">Assigned market:</span> <span className="font-medium text-slate-900">{user?.market || user?.station || '—'}</span></p></div></section></div></AppShell>;
}

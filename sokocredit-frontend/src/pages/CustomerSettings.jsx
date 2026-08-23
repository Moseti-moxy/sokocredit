import { User } from 'lucide-react';
import AppShell from '../components/AppShell';
import LanguageSettings from '../components/LanguageSettings';
import { useAuth } from '../hooks/useAuth';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-50 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

export default function CustomerSettings() {
  const { user } = useAuth();
  return (
    <AppShell title="Settings" subtitle="Manage your language and account preferences.">
      <div className="grid gap-5 lg:grid-cols-2">
        <LanguageSettings />

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <User size={20} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-900">Account Details</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">Contact SokoCredit Support to update any of these details.</p>
          <div>
            <InfoRow label="Full name" value={user?.name} />
            <InfoRow label="Customer reference" value={user?.customerId || user?.id} />
            <InfoRow label="National ID" value={user?.nationalId} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Phone" value={user?.phone} />
            <InfoRow label="Market" value={user?.market} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

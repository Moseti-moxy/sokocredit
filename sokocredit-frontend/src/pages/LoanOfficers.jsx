import { useMemo, useState } from 'react';
import { Mail, MapPin, Search, UserPlus, UsersRound } from 'lucide-react';
import AppShell from '../components/AppShell';
import { createStaffUser } from '../features/auth/api/usersApi';
import { getAgentDirectory, registerAgent, saveAgentPresence } from '../data/agentDirectory';
import { timeAgo } from '../utils/timeAgo';

export default function LoanOfficers() {
  // The directory is re-read after every update so persisted data is the single
  // source of truth for this mock frontend.
  const [agents, setAgents] = useState(getAgentDirectory);
  const [form, setForm] = useState({ name: '', email: '', password: '', station: '' }); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false); const [filter, setFilter] = useState('all'); const [query, setQuery] = useState('');
  // Summary cards use the complete directory, not the currently filtered list.
  const activeAgents = agents.filter((agent) => agent.isActive);
  const shown = useMemo(() => agents.filter((agent) => {
    // Apply the status filter and free-text search together.
    const matchesStatus = filter === 'all' || (filter === 'active' ? agent.isActive : !agent.isActive);
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [agent.name, agent.email, agent.station, agent.id].some((value) => value?.toLowerCase().includes(needle));
    return matchesStatus && matchesQuery;
  }), [agents, filter, query]);
  // Creates a real backend account (POST /api/users) so the agent can actually
  // sign in - a locally-stored mock account never worked against /api/auth/login
  // in a real deployment. Station/active-status tracking below it is still a
  // local-only presence layer since the backend has no such fields on User yet;
  // this merges the new account into it just for this session's directory view.
  async function submit(event) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      const user = await createStaffUser({ email: form.email, password: form.password, fullName: form.name, role: 'agent' });
      const presence = registerAgent({ id: user.id, staffId: user.id }, form.station);
      setAgents((current) => [...current, { id: user.id, staffId: user.id, name: user.fullName, email: user.email, role: user.role, ...presence }]);
      setForm({ name: '', email: '', password: '', station: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not create the agent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  // Re-activating an agent records a fresh timestamp. Going inactive preserves
  // their most recent activity time so an admin can still see it.
  function toggleStatus(id) {
    const agent = agents.find((item) => item.id === id); if (!agent) return;
    const presence = saveAgentPresence(id, { isActive: !agent.isActive, lastActiveAt: agent.isActive ? agent.lastActiveAt : new Date().toISOString() });
    setAgents((current) => current.map((item) => item.id === id ? { ...item, ...presence } : item));
  }
  return <AppShell title="Agents" subtitle="Admin directory for agent deployment and activity monitoring.">
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Metric label="All agents" value={agents.length} /><Metric label="Currently active" value={activeAgents.length} tone="text-green-600" /><Metric label="Offline / inactive" value={agents.length - activeAgents.length} tone="text-slate-500" /></div>
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]"><section className="h-max rounded-2xl border border-brand-100 bg-white p-6"><div className="mb-5 flex items-center gap-2"><UserPlus className="text-brand-600" size={20} /><h2 className="font-display font-semibold text-slate-900">Add agent</h2></div><form onSubmit={submit} className="space-y-4"><Input label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} /><Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Temporary password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} minLength={8} /><Input label="Assigned station / market" value={form.station} onChange={(station) => setForm({ ...form, station })} placeholder="e.g. Gikomba Market" />{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating…' : 'Create agent'}</button></form></section>
    <section className="rounded-2xl border border-brand-100 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 p-5"><div className="flex items-center gap-2"><UsersRound className="text-brand-600" size={20} /><div><h2 className="font-display font-semibold text-slate-900">Agent directory</h2><p className="text-xs text-slate-500">Stations and last activity are visible to administrators.</p></div></div><div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">{[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 ${filter === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}>{label}</button>)}</div></div><div className="border-b border-brand-50 px-5 py-3"><label className="flex max-w-md items-center gap-2 rounded-lg border border-brand-100 px-3 py-2 text-slate-400"><Search size={16} /><span className="sr-only">Search agents</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, ID, or station" className="w-full border-0 text-sm text-slate-700 outline-none" /></label></div>{shown.length ? <div className="divide-y divide-brand-50">{shown.map((agent) => <article key={agent.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className={`grid size-10 place-items-center rounded-full font-semibold ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{agent.name[0]}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-900">{agent.name}</p><span className={`rounded-full px-2 py-1 text-xs font-semibold ${agent.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{agent.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail size={12} />{agent.email}</p></div></div><div className="grid grid-cols-2 gap-4 text-sm sm:w-[320px]"><div><p className="text-xs text-slate-400">Stationed at</p><p className="mt-1 flex items-center gap-1 font-medium text-slate-700"><MapPin size={13} className="text-brand-600" />{agent.station}</p></div><div><p className="text-xs text-slate-400">Last active</p><p className="mt-1 font-medium text-slate-700">{agent.lastActiveAt ? timeAgo(agent.lastActiveAt) : 'Not yet active'}</p></div></div><button type="button" onClick={() => toggleStatus(agent.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${agent.isActive ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-brand-200 text-brand-700 hover:bg-brand-50'}`}>{agent.isActive ? 'Mark inactive' : 'Mark active'}</button></article>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No agents match this filter.</p>}</section></div>
  </AppShell>;
}
function Metric({ label, value, tone = 'text-slate-900' }) { return <div className="rounded-2xl border border-brand-100 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-display text-2xl font-semibold ${tone}`}>{value}</p></div>; }
function Input({ label, value, onChange, type = 'text', pattern, placeholder, minLength }) { return <label className="block text-sm font-medium text-slate-600">{label}<input required type={type} placeholder={placeholder} minLength={minLength} pattern={pattern} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-brand-100 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" /></label>; }

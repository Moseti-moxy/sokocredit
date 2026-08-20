import { Trophy } from 'lucide-react';
import { collectionTargets, fieldAgents } from '../data/mockData';
import { formatKES } from '../utils/format';

function TargetBar({ label, target, achieved }) {
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const barColor = pct >= 100 ? 'bg-brand-500' : pct >= 60 ? 'bg-brand-400' : 'bg-amber-400';

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {formatKES(achieved)} <span className="text-slate-400">/ {formatKES(target)}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-brand-50 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% of target</p>
    </div>
  );
}

export default function CollectionTargets() {
  const sortedAgents = [...fieldAgents].sort((a, b) => b.collectionsMtd - a.collectionsMtd);

  return (
    <section className="mt-6 grid lg:grid-cols-[1fr_320px] gap-5">
      <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
        <h2 className="font-display font-semibold text-slate-900 mb-4">Collection Targets</h2>
        <div className="space-y-5">
          <TargetBar
            label={collectionTargets.daily.label}
            target={collectionTargets.daily.target}
            achieved={collectionTargets.daily.achieved}
          />
          <TargetBar
            label={collectionTargets.weekly.label}
            target={collectionTargets.weekly.target}
            achieved={collectionTargets.weekly.achieved}
          />
          <TargetBar
            label={collectionTargets.monthly.label}
            target={collectionTargets.monthly.target}
            achieved={collectionTargets.monthly.achieved}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-brand-600" />
          <h2 className="font-display font-semibold text-slate-900">Officer Leaderboard</h2>
        </div>
        <ol className="space-y-3">
          {sortedAgents.map((agent, i) => (
            <li key={agent.id} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  i === 0 ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{agent.name}</p>
                <p className="text-xs text-slate-400 truncate">{agent.market}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-800">{formatKES(agent.collectionsMtd)}</p>
                {agent.note ? (
                  <p className="text-[11px] text-slate-400">{agent.note}</p>
                ) : agent.changePct ? (
                  <p className="text-[11px] text-brand-600">+{agent.changePct}%</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function StatCard({ label, value, delta, deltaLabel, icon: Icon, tone = 'default' }) {
  const toneClasses = {
    default: 'text-slate-900',
    danger: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Icon size={16} />
          </span>
        )}
      </div>
      <span className={`font-display text-2xl sm:text-3xl font-semibold truncate ${toneClasses[tone]}`}>
        {value}
      </span>
      {(delta || deltaLabel) && (
        <span className={`text-xs font-medium ${tone === 'danger' ? 'text-red-500' : 'text-brand-600'}`}>
          {delta}
          {delta && deltaLabel ? ' ' : ''}
          {deltaLabel && <span className="text-slate-400 font-normal">{deltaLabel}</span>}
        </span>
      )}
    </div>
  );
}

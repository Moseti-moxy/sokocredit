import { PRIORITY_DOT_CLASSES } from '../constants';

// Compact priority indicator: colored dot + label.
export default function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className={`size-2 shrink-0 rounded-full ${PRIORITY_DOT_CLASSES[priority] || 'bg-slate-400'}`} />
      {priority}
    </span>
  );
}

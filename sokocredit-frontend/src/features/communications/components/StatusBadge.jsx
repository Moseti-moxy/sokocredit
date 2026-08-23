import { statusBadgeClass } from '../constants';

// Colored pill for a support case status. Used across all three role
// interfaces so "Escalated" looks the same everywhere it appears.
export default function StatusBadge({ status, size = 'sm' }) {
  const sizing = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ${sizing} ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

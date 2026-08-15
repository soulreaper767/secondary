import { UNIVERSE_STATUS_COLOR } from '../lib/chartColors';

const LABELS: Record<string, string> = {
  UNTAPPED: 'Untapped',
  COVERED: 'Covered',
  PRODUCTIVE: 'Productive',
  NON_PRODUCTIVE: 'Non-Productive',
};

export function StatusBadge({ status }: { status: string }) {
  const color = UNIVERSE_STATUS_COLOR[status] || '#898781';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: color + '55', color, background: color + '14' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {LABELS[status] || status}
    </span>
  );
}

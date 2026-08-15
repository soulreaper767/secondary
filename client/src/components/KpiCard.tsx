import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean } | null;
  icon: LucideIcon;
  accent?: string;
  sub?: string;
}

export function KpiCard({ label, value, delta, icon: Icon, accent = '#2a78d6', sub }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: accent + '1c', color: accent }}>
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </div>
      <div className="tabular mt-3 text-[26px] font-bold leading-none text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span className={delta.positive ? 'font-semibold text-[var(--status-good)]' : 'font-semibold text-[var(--status-critical)]'}>
            {delta.positive ? '▲' : '▼'} {delta.value}
          </span>
        )}
        {sub && <span className="text-[var(--text-secondary)]">{sub}</span>}
      </div>
    </div>
  );
}

export function IconBadge({ icon: Icon, accent = '#2a78d6', size = 18 }: { icon: LucideIcon; accent?: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg" style={{ background: accent + '1c', color: accent, width: size + 16, height: size + 16 }}>
      <Icon size={size} strokeWidth={2.25} />
    </span>
  );
}

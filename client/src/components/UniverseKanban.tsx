import { Link } from 'react-router-dom';
import { Store, TrendingUp, AlertTriangle, Layers } from 'lucide-react';
import { Retailer, UniverseStatus } from '../types';
import { UNIVERSE_STATUS_COLOR } from '../lib/chartColors';

const COLUMNS: { key: UniverseStatus; label: string; hint: string; icon: typeof Store }[] = [
  { key: 'UNTAPPED', label: 'Untapped', hint: 'Added, not yet visited', icon: Store },
  { key: 'PRODUCTIVE', label: 'Productive', hint: 'Ordered within 30 days', icon: TrendingUp },
  { key: 'NON_PRODUCTIVE', label: 'Non-Productive', hint: 'Visited, no order in 30+ days', icon: AlertTriangle },
];

export function UniverseKanban({ data }: { data: Record<UniverseStatus, Retailer[]> }) {
  const covered = (data.PRODUCTIVE?.length || 0) + (data.NON_PRODUCTIVE?.length || 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <Layers size={14} className="text-[var(--muted)]" />
        <span>
          <span className="font-semibold text-[var(--text-primary)]">{covered.toLocaleString()}</span> Covered ={' '}
          <span className="font-semibold" style={{ color: UNIVERSE_STATUS_COLOR.PRODUCTIVE }}>
            {(data.PRODUCTIVE?.length || 0).toLocaleString()} Productive
          </span>{' '}
          +{' '}
          <span className="font-semibold" style={{ color: UNIVERSE_STATUS_COLOR.NON_PRODUCTIVE }}>
            {(data.NON_PRODUCTIVE?.length || 0).toLocaleString()} Non-Productive
          </span>
          — every visited shop is always one or the other, never both or neither.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = data[col.key] || [];
          const color = UNIVERSE_STATUS_COLOR[col.key];
          const Icon = col.icon;
          return (
            <div key={col.key} className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
              <div className="px-3 py-3" style={{ background: `linear-gradient(180deg, ${color}14 0%, transparent 100%)`, borderBottom: `2px solid ${color}` }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color }}>
                    <Icon size={15} strokeWidth={2.5} />
                    {col.label}
                  </span>
                  <span className="tabular rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: color }}>
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{col.hint}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {items.length === 0 && <div className="px-2 py-6 text-center text-xs text-[var(--muted)]">No shops</div>}
                {items.map((r) => (
                  <Link
                    key={r.id}
                    to={`/universe/${r.id}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div className="truncate font-semibold text-[var(--text-primary)]" title={r.name}>
                      {r.name}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center justify-between gap-1.5 text-[11px] text-[var(--text-secondary)]">
                      <span className="shrink-0 rounded-full bg-[var(--page)] px-1.5 py-0.5 font-medium">{r.category.replace('_', ' ')}</span>
                      <span className="min-w-0 truncate text-right" title={r.territoryNode?.name}>
                        {r.territoryNode?.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

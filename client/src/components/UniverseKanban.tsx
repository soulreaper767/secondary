import { Link } from 'react-router-dom';
import { Store, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import { Retailer, UniverseStatus } from '../types';
import { UNIVERSE_STATUS_COLOR } from '../lib/chartColors';

const COLUMNS: { key: UniverseStatus; label: string; hint: string; icon: typeof Store }[] = [
  { key: 'UNTAPPED', label: 'Untapped', hint: 'Added, not yet visited', icon: Store },
  { key: 'COVERED', label: 'Covered', hint: 'Visited, no order yet', icon: Eye },
  { key: 'PRODUCTIVE', label: 'Productive', hint: 'Ordered within 30 days', icon: TrendingUp },
  { key: 'NON_PRODUCTIVE', label: 'Non-Productive', hint: 'No order in 30+ days', icon: AlertTriangle },
];

export function UniverseKanban({ data }: { data: Record<UniverseStatus, Retailer[]> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <div className="font-semibold text-[var(--text-primary)]">{r.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span className="rounded-full bg-[var(--page)] px-1.5 py-0.5 font-medium">{r.category.replace('_', ' ')}</span>
                    <span>{r.territoryNode?.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

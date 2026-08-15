import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { IconBadge } from './KpiCard';

export function ChartCard({
  title,
  sub,
  action,
  icon,
  accent = '#2a78d6',
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <IconBadge icon={icon} accent={accent} size={16} />}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]" title={title}>
              {title}
            </h3>
            {sub && (
              <p className="truncate text-xs text-[var(--text-secondary)]" title={sub}>
                {sub}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

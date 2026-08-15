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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {icon && <IconBadge icon={icon} accent={accent} size={16} />}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            {sub && <p className="text-xs text-[var(--text-secondary)]">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

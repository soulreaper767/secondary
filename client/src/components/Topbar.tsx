import { useAuth } from '../auth/AuthContext';
import { NotificationBell } from './NotificationBell';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#52514e',
  CSO: '#4a3aa7',
  GM: '#4a3aa7',
  RM: '#2a78d6',
  UM: '#2a78d6',
  AM: '#1baf7a',
  TSO: '#1baf7a',
  OB: '#eb6834',
  DISTRIBUTOR: '#eda100',
};

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const accent = ROLE_COLOR[user.role.code] || '#2a78d6';

  return (
    <header className="no-print flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 md:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: accent + '1c', color: accent }}>
            {user.role.name}
          </span>
        </div>
        {user.territoryNode && (
          <div className="mt-1 truncate text-xs text-[var(--muted)]" title={user.territoryNode.name}>
            {user.territoryNode.name}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell />
        <div className="hidden items-center gap-2.5 sm:flex">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)` }}
          >
            {user.name.slice(0, 1)}
          </div>
          <div className="max-w-[160px] text-left">
            <div className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]" title={user.name}>
              {user.name}
            </div>
            <div className="truncate text-[10px] text-[var(--muted)] leading-tight">{user.employeeCode}</div>
          </div>
        </div>
        <button onClick={logout} className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--page)]">
          Sign out
        </button>
      </div>
    </header>
  );
}

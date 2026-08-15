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
    <header className="no-print flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-4 md:px-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: accent + '1c', color: accent }}>
            {user.role.name}
          </span>
        </div>
        {user.territoryNode && <div className="mt-1 text-xs text-[var(--muted)]">{user.territoryNode.name}</div>}
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)` }}
          >
            {user.name.slice(0, 1)}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-semibold leading-tight text-[var(--text-primary)]">{user.name}</div>
            <div className="text-[10px] text-[var(--muted)] leading-tight">{user.employeeCode}</div>
          </div>
        </div>
        <button onClick={logout} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--page)]">
          Sign out
        </button>
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Kanban,
  PlusCircle,
  Network,
  Route as RouteIcon,
  Navigation,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Undo2,
  PackagePlus,
  Truck,
  Boxes,
  ClipboardCheck,
  BarChart3,
  PieChart,
  Award,
  Users,
  ShieldCheck,
  Map,
  Building2,
  Package,
  Trophy,
  Target,
  Layers,
  MapPinned,
  Gauge,
  LucideIcon,
} from 'lucide-react';
import { NAV_SECTIONS } from '../nav';
import { useAuth } from '../auth/AuthContext';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Store,
  Kanban,
  PlusCircle,
  Network,
  Route: RouteIcon,
  Navigation,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Undo2,
  PackagePlus,
  Truck,
  Boxes,
  ClipboardCheck,
  BarChart3,
  PieChart,
  Award,
  Users,
  ShieldCheck,
  Map,
  Building2,
  Package,
  Trophy,
  Target,
  Layers,
  MapPinned,
  Gauge,
};

// Each nav section gets a distinct accent from the validated categorical palette.
const SECTION_ACCENT: Record<string, string> = {
  Overview: '#2a78d6',
  Universe: '#1baf7a',
  'Journey & Visits': '#4a3aa7',
  'Secondary Sales': '#eb6834',
  Distribution: '#eda100',
  Reports: '#e87ba4',
  Admin: '#52514e',
};

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  const roleCode = user.role.code;

  return (
    <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)] md:flex">
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, #2a78d6 0%, #4a3aa7 100%)' }}
        >
          SS
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-[var(--text-primary)]">SecondarySales</div>
          <div className="text-[10px] font-medium text-[var(--muted)] leading-tight">Sales &amp; Distribution</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => item.roles.includes(roleCode));
          if (visible.length === 0) return null;
          const accent = SECTION_ACCENT[section.title] || '#2a78d6';
          return (
            <div key={section.title} className="mb-4">
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{section.title}</div>
              {visible.map((item) => {
                const Icon = ICONS[item.icon] || LayoutDashboard;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--page)]'
                      }`
                    }
                    style={({ isActive }) => (isActive ? { background: accent + '16' } : undefined)}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: isActive ? accent : 'transparent', color: isActive ? '#fff' : 'var(--muted)' }}
                        >
                          <Icon size={15} strokeWidth={2.25} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

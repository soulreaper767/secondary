import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Notification } from '../types';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await api.get('/notifications');
    setItems(data.items);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    await api.post('/notifications/read-all');
    load();
  }

  async function markRead(id: number) {
    await api.post(`/notifications/${id}/read`);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)] hover:bg-[var(--page)]"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--status-critical)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-96 max-w-[90vw] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-[var(--series-1)] hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">No notifications yet</div>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`block w-full border-b border-[var(--border)] px-4 py-3 text-left last:border-0 hover:bg-[var(--page)] ${!n.isRead ? 'bg-[var(--series-1)]/5' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--series-1)]" />}
                  <span className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]" title={n.title}>
                    {n.title}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{n.message}</p>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

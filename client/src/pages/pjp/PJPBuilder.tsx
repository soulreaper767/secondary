import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Retailer, User } from '../../types';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function PJPBuilder() {
  const { user } = useAuth();
  const [obOptions, setObOptions] = useState<User[]>([]);
  const [selectedObId, setSelectedObId] = useState<number | null>(null);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [pjpId, setPjpId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role.code === 'OB') {
      setObOptions([user]);
      setSelectedObId(user.id);
    } else {
      api.get(`/users/${user.id}/reports`).then((r) => {
        const obs = r.data.filter((u: User) => u.role.code === 'OB');
        setObOptions(obs);
        if (obs.length) setSelectedObId(obs[0].id);
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!selectedObId) return;
    const ob = obOptions.find((o) => o.id === selectedObId);
    if (ob?.territoryNodeId) {
      api.get('/retailers', { params: { territoryNodeId: ob.territoryNodeId, pageSize: 200 } }).then((r) => setRetailers(r.data.items));
    }
    api.get('/pjp', { params: { obUserId: selectedObId } }).then((r) => {
      const pjp = r.data[0];
      if (pjp) {
        setPjpId(pjp.id);
        const map: Record<string, boolean> = {};
        for (const e of pjp.entries) map[`${e.retailerId}-${e.dayOfWeek}`] = true;
        setEntries(map);
      } else {
        setPjpId(null);
        setEntries({});
      }
    });
  }, [selectedObId, obOptions]);

  function toggle(retailerId: number, dow: number) {
    setSaved(false);
    setEntries((prev) => ({ ...prev, [`${retailerId}-${dow}`]: !prev[`${retailerId}-${dow}`] }));
  }

  const entryList = useMemo(
    () =>
      Object.entries(entries)
        .filter(([, v]) => v)
        .map(([k]) => {
          const [retailerId, dayOfWeek] = k.split('-').map(Number);
          return { retailerId, dayOfWeek };
        }),
    [entries]
  );

  async function save() {
    if (!selectedObId) return;
    setSaving(true);
    try {
      const ob = obOptions.find((o) => o.id === selectedObId);
      if (pjpId) {
        await api.put(`/pjp/${pjpId}`, { entries: entryList });
      } else {
        const { data } = await api.post('/pjp', { name: `${ob?.name.split(' (')[0]} - Weekly PJP`, obUserId: selectedObId, entries: entryList });
        setPjpId(data.id);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">PJP Builder</h1>
          <p className="text-sm text-[var(--text-secondary)]">Assign which day(s) of the week each outlet should be visited.</p>
        </div>
        <div className="flex items-center gap-2">
          {obOptions.length > 1 && (
            <select value={selectedObId ?? ''} onChange={(e) => setSelectedObId(Number(e.target.value))} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
              {obOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={save} disabled={saving} className="rounded-lg bg-[var(--series-1)] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save PJP'}
          </button>
          {saved && <span className="text-xs font-medium text-[var(--status-good)]">Saved</span>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Retailer</th>
              {DAYS.map((d) => (
                <th key={d.value} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {retailers.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--page)]">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                {DAYS.map((d) => (
                  <td key={d.value} className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!entries[`${r.id}-${d.value}`]} onChange={() => toggle(r.id, d.value)} className="h-4 w-4 accent-[var(--series-1)]" />
                  </td>
                ))}
              </tr>
            ))}
            {retailers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--text-secondary)]">
                  No retailers found for this territory yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { User } from '../../types';

const now = new Date();
const emptyForm = { userId: 0, periodMonth: now.getMonth() + 1, periodYear: now.getFullYear(), targetType: 'VALUE', targetValue: 0 };

interface Target {
  id: number;
  periodMonth: number;
  periodYear: number;
  targetType: string;
  targetValue: number;
  user: { id: number; name: string; role: { code: string } };
}

export default function AdminTargets() {
  const [items, setItems] = useState<Target[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/targets', { params: { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() } }).then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
    api.get('/users').then((r) => setUsers(r.data.filter((u: User) => u.role.code !== 'ADMIN' && u.role.code !== 'DISTRIBUTOR')));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/targets', { ...form, userId: Number(form.userId), targetValue: Number(form.targetValue) });
      setForm({ ...emptyForm });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set target');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Targets</h1>
          <p className="text-sm text-[var(--text-secondary)]">Current period: {now.getMonth() + 1}/{now.getFullYear()}</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ Set Target'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value={0}>Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.code})
              </option>
            ))}
          </select>
          <input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" placeholder="Month" />
          <input type="number" value={form.periodYear} onChange={(e) => setForm({ ...form, periodYear: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" placeholder="Year" />
          <input required type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" placeholder="Target value (Rs)" />
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save Target'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(t) => t.id}
          rows={items}
          columns={[
            { header: 'User', cell: (t) => t.user.name },
            { header: 'Role', cell: (t) => t.user.role.code },
            { header: 'Period', cell: (t) => `${t.periodMonth}/${t.periodYear}` },
            { header: 'Type', cell: (t) => t.targetType },
            { header: 'Target', cell: (t) => `Rs ${t.targetValue.toLocaleString()}`, align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}

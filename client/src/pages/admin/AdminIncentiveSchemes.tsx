import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Role } from '../../types';

interface Scheme {
  id: number;
  name: string;
  basis: string;
  rulesJson: string;
  active: boolean;
  role: Role;
}

const RULES_TEMPLATE: Record<string, string> = {
  PERCENT_OF_SALES: '{"percent": 2}',
  SLAB_ON_ACHIEVEMENT: '{"slabs":[{"minPct":0,"maxPct":80,"amount":0},{"minPct":80,"maxPct":100,"amount":15000},{"minPct":100,"maxPct":9999,"amount":30000}]}',
  PER_CASE_SOLD: '{"ratePerCase": 5}',
  PER_NEW_PRODUCTIVE_SHOP: '{"ratePerShop": 300}',
};

const emptyForm = { name: '', roleId: 0, basis: 'PERCENT_OF_SALES', rulesJson: RULES_TEMPLATE.PERCENT_OF_SALES };

export default function AdminIncentiveSchemes() {
  const [items, setItems] = useState<Scheme[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/incentives/schemes').then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
    api.get('/roles').then((r) => setRoles(r.data));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      JSON.parse(form.rulesJson);
    } catch {
      setError('Rules JSON is not valid JSON');
      return;
    }
    setBusy(true);
    try {
      await api.post('/incentives/schemes', { ...form, roleId: Number(form.roleId) });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create scheme');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Incentive Schemes</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            A role can carry several active schemes at once — e.g. a base % of sales plus a per-case volume kicker and a new-outlet bonus — the earnings engine sums them all.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Scheme'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2">
          <input required placeholder="Scheme name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value={0}>Select role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={form.basis}
            onChange={(e) => setForm({ ...form, basis: e.target.value, rulesJson: RULES_TEMPLATE[e.target.value] })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="PERCENT_OF_SALES">Percent of Sales</option>
            <option value="SLAB_ON_ACHIEVEMENT">Slab on Achievement %</option>
            <option value="PER_CASE_SOLD">Per Case/Unit Sold</option>
            <option value="PER_NEW_PRODUCTIVE_SHOP">Per New Productive Shop</option>
          </select>
          <textarea
            required
            value={form.rulesJson}
            onChange={(e) => setForm({ ...form, rulesJson: e.target.value })}
            rows={3}
            className="col-span-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs"
          />
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Scheme'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(s) => s.id}
          rows={items}
          columns={[
            { header: 'Name', cell: (s) => s.name },
            { header: 'Role', cell: (s) => s.role.name },
            { header: 'Basis', cell: (s) => s.basis.replace(/_/g, ' ') },
            { header: 'Rules', cell: (s) => <code className="text-[11px]">{s.rulesJson}</code> },
            { header: 'Active', cell: (s) => (s.active ? 'Yes' : 'No') },
          ]}
        />
      </div>
    </div>
  );
}

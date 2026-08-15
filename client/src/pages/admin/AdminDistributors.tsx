import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Distributor, TerritoryNode } from '../../types';

const emptyForm = { name: '', code: '', territoryNodeId: '', address: '', contactPerson: '', phone: '', creditLimit: 0, createLogin: true, loginEmail: '' };

export default function AdminDistributors() {
  const [items, setItems] = useState<Distributor[]>([]);
  const [territories, setTerritories] = useState<TerritoryNode[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/distributors').then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
    api.get('/territories', { params: {} }).then((r) => setTerritories(r.data.filter((n: TerritoryNode) => n.level === 'AREA')));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/distributors', { ...form, territoryNodeId: Number(form.territoryNodeId), creditLimit: Number(form.creditLimit) });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create distributor');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Distributors</h1>
          <p className="text-sm text-[var(--text-secondary)]">{items.length} distributors</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Distributor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Distributor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Code (unique)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select required value={form.territoryNodeId} onChange={(e) => setForm({ ...form, territoryNodeId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Select Area…</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input type="number" placeholder="Credit limit" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="col-span-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <label className="col-span-full flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} className="accent-[var(--series-1)]" />
            Create a distributor portal login
          </label>
          {form.createLogin && (
            <input type="email" placeholder="Login email" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          )}
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Distributor'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(d) => d.id}
          rows={items}
          columns={[
            { header: 'Name', cell: (d) => d.name },
            { header: 'Code', cell: (d) => d.code },
            { header: 'Area', cell: (d) => d.territoryNode?.name },
            { header: 'Contact', cell: (d) => d.contactPerson || '—' },
            { header: 'Credit Limit', cell: (d) => `Rs ${d.creditLimit.toLocaleString()}`, align: 'right' },
            { header: 'Status', cell: (d) => d.status },
          ]}
        />
      </div>
    </div>
  );
}

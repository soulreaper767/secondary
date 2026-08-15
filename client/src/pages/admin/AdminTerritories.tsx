import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { TerritoryNode, User } from '../../types';

const LEVELS = ['NATIONAL', 'REGION', 'SUB_REGION', 'AREA', 'TERRITORY'];
const emptyForm = { name: '', code: '', level: 'TERRITORY', parentId: '', managerUserId: '', marketPotential: 0 };

export default function AdminTerritories() {
  const [nodes, setNodes] = useState<TerritoryNode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [potentialDraft, setPotentialDraft] = useState<Record<number, string>>({});

  function load() {
    api.get('/territories').then((r) => setNodes(r.data));
  }

  useEffect(() => {
    load();
    api.get('/users').then((r) => setUsers(r.data));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/territories', {
        ...form,
        parentId: form.parentId ? Number(form.parentId) : null,
        managerUserId: form.managerUserId ? Number(form.managerUserId) : null,
        marketPotential: Number(form.marketPotential) || 0,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create territory');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this territory node? It must have no children.')) return;
    try {
      await api.delete(`/territories/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  }

  async function savePotential(id: number) {
    const value = Number(potentialDraft[id]);
    if (Number.isNaN(value) || value < 0) return;
    await api.put(`/territories/${id}`, { marketPotential: value });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Territories</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {nodes.length} nodes in the territory tree. Market Potential is the estimated true addressable shop count — set it at Territory
            level; higher nodes roll it up automatically for the Coverage Opportunity report.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Territory Node'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Code (unique)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">No parent (root)</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.level})
              </option>
            ))}
          </select>
          <select value={form.managerUserId} onChange={(e) => setForm({ ...form, managerUserId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">No manager assigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.code})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Market Potential (est. addressable shops)"
            value={form.marketPotential}
            onChange={(e) => setForm({ ...form, marketPotential: e.target.value })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Territory Node'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(n) => n.id}
          rows={nodes}
          columns={[
            { header: 'Name', cell: (n) => n.name },
            { header: 'Code', cell: (n) => n.code },
            { header: 'Level', cell: (n) => n.level },
            { header: 'Manager', cell: (n) => n.managerUser?.name || '—' },
            {
              header: 'Market Potential',
              align: 'right',
              cell: (n) => (
                <div className="flex items-center justify-end gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={potentialDraft[n.id] ?? n.marketPotential}
                    onChange={(e) => setPotentialDraft((prev) => ({ ...prev, [n.id]: e.target.value }))}
                    className="w-20 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  />
                  <button onClick={() => savePotential(n.id)} className="text-xs text-[var(--series-1)] hover:underline">
                    Save
                  </button>
                </div>
              ),
            },
            { header: '', cell: (n) => <button onClick={() => remove(n.id)} className="text-xs text-[var(--status-critical)] hover:underline">Delete</button> },
          ]}
        />
      </div>
    </div>
  );
}

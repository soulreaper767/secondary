import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Role } from '../../types';

const emptyForm = { code: '', name: '', level: 6, description: '' };

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/roles').then((r) => setRoles(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/roles', { ...form, level: Number(form.level), code: form.code.toUpperCase() });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create role');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Roles</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            The seeded sales ladder (CSO → GM → RM → UM → AM → TSO → OB → Distributor) plus any company-specific roles you add here.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Role'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Code (e.g. KAM)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase" />
          <input required placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required type="number" min={0} placeholder="Hierarchy level (0=top)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Role'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.id}
          rows={roles}
          columns={[
            { header: 'Level', cell: (r) => r.level, align: 'center' },
            { header: 'Code', cell: (r) => <code className="text-xs">{r.code}</code> },
            { header: 'Name', cell: (r) => r.name },
            { header: 'Description', cell: (r) => r.description || '—' },
          ]}
        />
      </div>
    </div>
  );
}

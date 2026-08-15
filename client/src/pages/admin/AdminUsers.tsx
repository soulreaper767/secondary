import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Role, TerritoryNode, User } from '../../types';

const emptyForm = { name: '', email: '', employeeCode: '', phone: '', roleId: 0, territoryNodeId: '', managerId: '' };

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [territories, setTerritories] = useState<TerritoryNode[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/users').then((r) => setUsers(r.data));
  }

  useEffect(() => {
    load();
    api.get('/roles').then((r) => setRoles(r.data));
    api.get('/territories').then((r) => setTerritories(r.data));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/users', {
        ...form,
        roleId: Number(form.roleId),
        territoryNodeId: form.territoryNodeId ? Number(form.territoryNodeId) : null,
        managerId: form.managerId ? Number(form.managerId) : null,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u: User) {
    await api.patch(`/users/${u.id}/status`, { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Users</h1>
          <p className="text-sm text-[var(--text-secondary)]">{users.length} users across the organization</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Employee code" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value={0}>Select role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select value={form.territoryNodeId} onChange={(e) => setForm({ ...form, territoryNodeId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">No territory scope</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.level})
              </option>
            ))}
          </select>
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">No manager</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.code})
              </option>
            ))}
          </select>
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create User (default password: Password123!)'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(u) => u.id}
          rows={users}
          columns={[
            { header: 'Name', cell: (u) => u.name },
            { header: 'Role', cell: (u) => u.role.name },
            { header: 'Territory', cell: (u) => u.territoryNode?.name || '—' },
            { header: 'Manager', cell: (u) => u.manager?.name || '—' },
            { header: 'Email', cell: (u) => u.email },
            { header: 'Status', cell: (u) => <span className={u.status === 'ACTIVE' ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}>{u.status}</span> },
            { header: '', cell: (u) => <button onClick={() => toggleStatus(u)} className="text-xs text-[var(--series-1)] hover:underline">{u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button> },
          ]}
        />
      </div>
    </div>
  );
}

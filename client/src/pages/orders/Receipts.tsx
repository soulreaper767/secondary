import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { Receipt, Retailer, OutstandingRow } from '../../types';

export default function Receipts() {
  const { user } = useAuth();
  const [items, setItems] = useState<Receipt[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ retailerId: '', amount: '', method: 'CASH' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/receipts').then((r) => setItems(r.data.items));
    api.get('/receipts/outstanding').then((r) => setOutstanding(r.data));
  }

  useEffect(() => {
    load();
    if (user?.territoryNodeId) api.get('/retailers', { params: { territoryNodeId: user.territoryNodeId, pageSize: 200 } }).then((r) => setRetailers(r.data.items));
    else api.get('/retailers', { params: { pageSize: 200 } }).then((r) => setRetailers(r.data.items));
  }, [user?.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/receipts', { retailerId: Number(form.retailerId), amount: Number(form.amount), method: form.method });
      setForm({ retailerId: '', amount: '', method: 'CASH' });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record receipt');
    } finally {
      setBusy(false);
    }
  }

  const canCollect = user && ['OB'].includes(user.role.code);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Receipts & Outstanding Balances" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Receipts</h1>
          <p className="text-sm text-[var(--text-secondary)]">Payments collected against secondary sale orders — shops are commonly extended short-term credit.</p>
        </div>
        <PrintButton />
        {canCollect && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            {showForm ? 'Cancel' : '+ Record Receipt'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-3">
          <select required value={form.retailerId} onChange={(e) => setForm({ ...form, retailerId: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="">Select retailer…</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input required type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CREDIT_NOTE">Credit Note</option>
          </select>
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Record Receipt'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <h3 className="px-2 py-1.5 text-sm font-semibold">Recent Receipts</h3>
        <DataTable
          keyFn={(r) => r.id}
          rows={items}
          columns={[
            { header: 'Receipt #', cell: (r) => r.receiptNumber },
            { header: 'Date', cell: (r) => new Date(r.receivedAt).toLocaleDateString() },
            { header: 'Retailer', cell: (r) => r.retailer?.name },
            { header: 'Method', cell: (r) => r.method },
            { header: 'Amount', cell: (r) => `Rs ${r.amount.toLocaleString()}`, align: 'right' },
          ]}
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <h3 className="px-2 py-1.5 text-sm font-semibold">Outstanding Balances</h3>
        <DataTable
          keyFn={(r) => r.id}
          rows={outstanding}
          emptyText="No outstanding balances in scope."
          columns={[
            { header: 'Retailer', cell: (r) => r.name },
            { header: 'Territory', cell: (r) => r.territory },
            { header: 'Ordered', cell: (r) => `Rs ${r.ordered.toLocaleString()}`, align: 'right' },
            { header: 'Collected', cell: (r) => `Rs ${r.collected.toLocaleString()}`, align: 'right' },
            { header: 'Outstanding', cell: (r) => <span className="font-semibold text-[var(--status-critical)]">Rs {r.outstanding.toLocaleString()}</span>, align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}

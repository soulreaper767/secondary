import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { PrintButton, PrintHeader } from '../../components/Print';
import { StockOrder, Distributor, Product } from '../../types';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Pending', APPROVED: 'Approved', FULFILLED: 'Fulfilled', REJECTED: 'Rejected' };

export default function StockOrders() {
  const { user } = useAuth();
  const [items, setItems] = useState<StockOrder[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [distributorId, setDistributorId] = useState('');
  const [lines, setLines] = useState<{ productId: number; qty: number }[]>([{ productId: 0, qty: 100 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/stock-orders').then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
    api.get('/distributors').then((r) => {
      setDistributors(r.data);
      if (r.data.length) setDistributorId(String(r.data[0].id));
    });
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
  }, []);

  function addLine() {
    setLines((prev) => [...prev, { productId: 0, qty: 100 }]);
  }
  function updateLine(i: number, patch: Partial<{ productId: number; qty: number }>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit() {
    setError('');
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (!distributorId || validLines.length === 0) return;
    setBusy(true);
    try {
      await api.post('/stock-orders', { distributorId: Number(distributorId), items: validLines });
      setLines([{ productId: 0, qty: 100 }]);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to raise stock order');
    } finally {
      setBusy(false);
    }
  }

  async function fulfill(id: number) {
    await api.post(`/stock-orders/${id}/fulfill`);
    load();
  }
  async function reject(id: number) {
    await api.post(`/stock-orders/${id}/reject`);
    load();
  }

  const canApprove = user && ['ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'].includes(user.role.code);
  const canRequest = user && ['ADMIN', 'DISTRIBUTOR', 'CSO', 'GM', 'RM', 'UM', 'AM'].includes(user.role.code);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Stock Orders (Indents)" meta={[{ label: 'Total requests', value: String(items.length) }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Stock Orders (Indents)</h1>
          <p className="text-sm text-[var(--text-secondary)]">A distributor's replenishment request to the company — approve &amp; fulfil to issue the primary stock transfer.</p>
        </div>
        <PrintButton />
        {canRequest && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            {showForm ? 'Cancel' : '+ Raise Stock Order'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)} className="w-full max-w-sm rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={line.productId} onChange={(e) => updateLine(i, { productId: Number(e.target.value) })} className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm">
                  <option value={0}>Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.packSize})
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
              </div>
            ))}
            <button onClick={addLine} type="button" className="text-xs font-medium text-[var(--series-1)] hover:underline">
              + Add line
            </button>
          </div>
          {error && <p className="text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Submit Stock Order'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.map((so) => (
          <div key={so.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{so.orderNumber}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: so.status === 'FULFILLED' ? 'var(--status-good)22' : so.status === 'REJECTED' ? 'var(--status-critical)22' : 'var(--status-warning)22',
                      color: so.status === 'FULFILLED' ? 'var(--status-good)' : so.status === 'REJECTED' ? 'var(--status-critical)' : '#a16207',
                    }}
                  >
                    {STATUS_LABEL[so.status]}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {so.distributor?.name} · requested by {so.requestedByUser?.name} · {new Date(so.orderDate).toLocaleDateString()}
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{so.items.map((i) => `${i.product?.name} x${i.qty}`).join(', ')}</div>
              </div>
              {canApprove && so.status === 'PENDING' && (
                <div className="flex gap-1.5">
                  <button onClick={() => fulfill(so.id)} className="rounded-lg bg-[var(--status-good)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    Approve &amp; Fulfil
                  </button>
                  <button onClick={() => reject(so.id)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--page)]">
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-sm text-[var(--text-secondary)]">No stock orders yet.</div>}
      </div>
    </div>
  );
}

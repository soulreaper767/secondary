import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Distributor, Product, Retailer } from '../../types';

interface LineItem {
  productId: number;
  qty: number;
  unitPrice: number;
}

export default function NewOrder() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [retailerId, setRetailerId] = useState<number | ''>('');
  const [distributorId, setDistributorId] = useState<number | ''>('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: 0, qty: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.territoryNodeId) return;
    api.get('/retailers', { params: { territoryNodeId: user.territoryNodeId, pageSize: 200 } }).then((r) => setRetailers(r.data.items));
    api.get('/distributors').then((r) => {
      setDistributors(r.data);
      if (r.data.length) setDistributorId(r.data[0].id);
    });
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
    const rid = searchParams.get('retailerId');
    if (rid) setRetailerId(Number(rid));
  }, [user?.id]);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: 0, qty: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }
  function onProductChange(i: number, productId: number) {
    const product = products.find((p) => p.id === productId);
    updateLine(i, { productId, unitPrice: product?.distributorPrice || 0 });
  }

  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  async function submit() {
    setError('');
    if (!retailerId || !distributorId) {
      setError('Select a retailer and distributor');
      return;
    }
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (validLines.length === 0) {
      setError('Add at least one product line');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/orders', { retailerId, distributorId, items: validLines });
      navigate(`/orders`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">New Secondary Sale Order</h1>
        <p className="text-sm text-[var(--text-secondary)]">Booking this order marks the outlet Productive and reduces the distributor's stock.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Retailer *</label>
            <select value={retailerId} onChange={(e) => setRetailerId(Number(e.target.value))} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <option value="">Select retailer…</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Distributor *</label>
            <select value={distributorId} onChange={(e) => setDistributorId(Number(e.target.value))} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Products</label>
            <button onClick={addLine} type="button" className="text-xs font-medium text-[var(--series-1)] hover:underline">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={line.productId} onChange={(e) => onProductChange(i, Number(e.target.value))} className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm">
                  <option value={0}>Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.packSize})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min={0}
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm"
                  placeholder="Rate"
                />
                <span className="tabular w-24 text-right text-sm">Rs {(line.qty * line.unitPrice).toLocaleString()}</span>
                <button onClick={() => removeLine(i)} type="button" className="text-[var(--status-critical)]">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Order Total</span>
          <span className="tabular text-lg font-semibold">Rs {total.toLocaleString()}</span>
        </div>

        {error && <p className="text-xs font-medium text-[var(--status-critical)]">{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-[var(--series-1)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {busy ? 'Placing order…' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}

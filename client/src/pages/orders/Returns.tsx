import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ReturnDoc, Retailer, Distributor, Product } from '../../types';
import { variantName } from '../../lib/product';

interface LineItem {
  productId: number;
  qty: number;
  unitPrice: number;
}

const REASONS = ['Damaged in transit', 'Near expiry', 'Wrong SKU delivered', 'Shop overstocked', 'Other'];

export default function Returns() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReturnDoc[]>([]);
  const [returnsTotal, setReturnsTotal] = useState(0);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [retailerId, setRetailerId] = useState('');
  const [distributorId, setDistributorId] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [lines, setLines] = useState<LineItem[]>([{ productId: 0, qty: 1, unitPrice: 0 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [filterRetailerId, setFilterRetailerId] = useState<string | number>('');
  const [filterDistributorId, setFilterDistributorId] = useState<string | number>('');

  function load() {
    api.get('/returns', { params: { retailerId: filterRetailerId || undefined, distributorId: filterDistributorId || undefined } }).then((r) => {
      setItems(r.data.items);
      setReturnsTotal(r.data.totalAmount);
    });
  }

  useEffect(() => {
    if (user?.territoryNodeId) api.get('/retailers', { params: { territoryNodeId: user.territoryNodeId, pageSize: 200 } }).then((r) => setRetailers(r.data.items));
    api.get('/distributors').then((r) => {
      setDistributors(r.data);
      if (r.data.length) setDistributorId(String(r.data[0].id));
    });
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
  }, [user?.id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRetailerId, filterDistributorId]);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onProductChange(i: number, productId: number) {
    const p = products.find((p) => p.id === productId);
    updateLine(i, { productId, unitPrice: p?.distributorPrice || 0 });
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: 0, qty: 1, unitPrice: 0 }]);
  }

  const canFile = user && ['OB'].includes(user.role.code);
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  async function submit() {
    setError('');
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (!retailerId || !distributorId || validLines.length === 0) {
      setError('Select a retailer, distributor and at least one product line');
      return;
    }
    setBusy(true);
    try {
      await api.post('/returns', { retailerId: Number(retailerId), distributorId: Number(distributorId), reason, items: validLines });
      setLines([{ productId: 0, qty: 1, unitPrice: 0 }]);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record return');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Returns Register" meta={[{ label: 'Total returns', value: String(items.length) }, { label: 'Total value', value: `Rs ${returnsTotal.toLocaleString()}` }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Returns</h1>
          <p className="text-sm text-[var(--text-secondary)]">Goods returned from a shop back to the distributor — reverses the secondary-sale stock impact.</p>
        </div>
        <PrintButton />
        {canFile && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            {showForm ? 'Cancel' : '+ New Return'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select required value={retailerId} onChange={(e) => setRetailerId(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <option value="">Select retailer…</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
                        {variantName(p)}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                  <input type="number" min={0} value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                  <span className="tabular w-24 text-right text-sm">Rs {(line.qty * line.unitPrice).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Return Total</span>
            <span className="tabular text-lg font-semibold">Rs {total.toLocaleString()}</span>
          </div>
          {error && <p className="text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Record Return'}
          </button>
        </div>
      )}

      <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Filter to one:</span>
        <SearchableSelect allLabel="All Shops" value={filterRetailerId} onChange={setFilterRetailerId} options={retailers.map((r) => ({ value: r.id, label: r.name }))} placeholder="Search shop…" />
        <SearchableSelect allLabel="All Distributors" value={filterDistributorId} onChange={setFilterDistributorId} options={distributors.map((d) => ({ value: d.id, label: d.name }))} placeholder="Search distributor…" />
      </div>

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.id}
          rows={items}
          columns={[
            { header: 'Return #', cell: (r) => r.returnNumber },
            { header: 'Date', cell: (r) => new Date(r.returnDate).toLocaleDateString() },
            { header: 'Retailer', cell: (r) => r.retailer?.name },
            { header: 'Distributor', cell: (r) => r.distributor?.name },
            { header: 'Reason', cell: (r) => r.reason || '—' },
            { header: 'Amount', cell: (r) => `Rs ${r.totalAmount.toLocaleString()}`, align: 'right' },
          ]}
          footer={['Total', '', '', '', '', `Rs ${returnsTotal.toLocaleString()}`]}
        />
      </div>
    </div>
  );
}

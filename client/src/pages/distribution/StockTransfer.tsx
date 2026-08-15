import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PrintButton, PrintHeader } from '../../components/Print';
import { Distributor, Product } from '../../types';

interface LineItem {
  productId: number;
  qty: number;
  rate: number;
}

export default function StockTransfer() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [distributorId, setDistributorId] = useState<number | ''>('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: 0, qty: 100, rate: 0 }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [transfers, setTransfers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/distributors').then((r) => {
      setDistributors(r.data);
      if (r.data.length) setDistributorId(r.data[0].id);
    });
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
  }, []);

  useEffect(() => {
    if (distributorId) api.get('/stock/transfers', { params: { distributorId } }).then((r) => setTransfers(r.data));
  }, [distributorId, message]);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onProductChange(i: number, productId: number) {
    const p = products.find((p) => p.id === productId);
    updateLine(i, { productId, rate: p?.distributorPrice || 0 });
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: 0, qty: 100, rate: 0 }]);
  }

  async function submit() {
    setMessage('');
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (!distributorId || validLines.length === 0) return;
    setBusy(true);
    try {
      await api.post('/stock/transfers', { distributorId, items: validLines });
      setMessage('Stock transfer recorded.');
      setLines([{ productId: 0, qty: 100, rate: 0 }]);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to record transfer');
    } finally {
      setBusy(false);
    }
  }

  const selectedDistributor = distributors.find((d) => d.id === distributorId);

  return (
    <div className="print-area space-y-4">
      <PrintHeader
        documentTitle="Primary Stock Transfer Statement"
        party={selectedDistributor ? { label: 'Distributor', name: selectedDistributor.name, code: selectedDistributor.code, address: selectedDistributor.address, phone: selectedDistributor.phone } : null}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Primary Stock Transfer</h1>
          <p className="text-sm text-[var(--text-secondary)]">Record stock dispatched from the company to a distributor.</p>
        </div>
        <PrintButton />
      </div>

      <div className="no-print space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Distributor</label>
          <select value={distributorId} onChange={(e) => setDistributorId(Number(e.target.value))} className="w-full max-w-sm rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Items</label>
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
                <input type="number" min={1} value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" placeholder="Qty" />
                <input type="number" min={0} value={line.rate} onChange={(e) => updateLine(i, { rate: Number(e.target.value) })} className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" placeholder="Rate" />
              </div>
            ))}
          </div>
        </div>

        {message && <p className="text-xs font-medium text-[var(--status-good)]">{message}</p>}
        <button onClick={submit} disabled={busy} className="rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {busy ? 'Recording…' : 'Record Transfer'}
        </button>
      </div>

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <h3 className="mb-2 px-1 text-sm font-semibold">Recent Transfers to this Distributor</h3>
        <div className="space-y-2">
          {transfers.map((t) => (
            <div key={t.id} className="rounded-lg border border-[var(--border)] p-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.referenceNo}</span>
                <span className="text-xs text-[var(--muted)]">{new Date(t.transferDate).toLocaleDateString()}</span>
              </div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {t.items.map((it: any) => `${it.product.name} x${it.qty}`).join(', ')}
              </div>
            </div>
          ))}
          {transfers.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No transfers yet.</p>}
        </div>
      </div>
    </div>
  );
}

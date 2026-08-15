import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Retailer, Visit, Order, Product } from '../../types';
import { ClipboardCheck, MapPin } from 'lucide-react';

interface StockTake {
  id: number;
  takenAt: string;
  items: { productId: number; qty: number; product: Product }[];
}

export default function RetailerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [retailer, setRetailer] = useState<(Retailer & { visits: Visit[]; orders: Order[] }) | null>(null);
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);
  const [showStockTakeForm, setShowStockTakeForm] = useState(false);
  const [stockTakeQty, setStockTakeQty] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/retailers/${id}`).then((r) => setRetailer(r.data));
    api.get('/stock-takes', { params: { retailerId: id } }).then((r) => setStockTakes(r.data));
  }

  useEffect(() => {
    load();
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
  }, [id]);

  if (!retailer) return <div className="text-sm text-[var(--text-secondary)]">Loading…</div>;

  const isOb = user?.role.code === 'OB';

  async function logVisit() {
    setBusy(true);
    try {
      const { data } = await api.post('/route-plans/adhoc', { retailerId: Number(id) });
      setLastVisit(data);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function outcome(o: string) {
    if (!lastVisit) return;
    setBusy(true);
    try {
      await api.post(`/route-plans/${lastVisit.id}/outcome`, { outcome: o });
      setLastVisit(null);
      load();
      if (o === 'ORDER_TAKEN') navigate(`/orders/new?retailerId=${id}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitStockTake() {
    const items = Object.entries(stockTakeQty)
      .filter(([, qty]) => qty >= 0)
      .map(([productId, qty]) => ({ productId: Number(productId), qty }));
    if (items.length === 0) return;
    setBusy(true);
    try {
      await api.post('/stock-takes', { retailerId: Number(id), items });
      setStockTakeQty({});
      setShowStockTakeForm(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  const latestStockTake = stockTakes[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm sm:flex-row">
        {retailer.imageUrl && <img src={retailer.imageUrl} alt={retailer.name} className="h-32 w-32 rounded-xl object-cover" />}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{retailer.name}</h1>
              <StatusBadge status={retailer.status} />
            </div>
            {isOb && (
              <div className="flex flex-wrap gap-1.5">
                {!lastVisit && (
                  <button onClick={logVisit} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
                    <MapPin size={13} /> Log Visit
                  </button>
                )}
                {lastVisit && (
                  <>
                    <span className="self-center text-xs text-[var(--text-secondary)]">Outcome:</span>
                    <button onClick={() => outcome('ORDER_TAKEN')} disabled={busy} className="rounded-lg bg-[var(--status-good)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                      Order Taken
                    </button>
                    <button onClick={() => outcome('NO_ORDER')} disabled={busy} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--page)]">
                      No Order
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowStockTakeForm((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--page)]"
                >
                  <ClipboardCheck size={13} /> Stock Take
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
            <div>
              <span className="text-[var(--muted)]">Owner: </span>
              {retailer.ownerName || '—'}
            </div>
            <div>
              <span className="text-[var(--muted)]">Category: </span>
              {retailer.category.replace('_', ' ')}
            </div>
            <div>
              <span className="text-[var(--muted)]">Territory: </span>
              {retailer.territoryNode?.name}
            </div>
            <div>
              <span className="text-[var(--muted)]">Phone: </span>
              {retailer.phone || '—'}
            </div>
            <div>
              <span className="text-[var(--muted)]">Added by: </span>
              {retailer.addedByUser?.name}
            </div>
            <div>
              <span className="text-[var(--muted)]">Last order: </span>
              {retailer.lastOrderDate ? new Date(retailer.lastOrderDate).toLocaleDateString() : '—'}
            </div>
          </div>
          {retailer.address && <p className="mt-2 text-sm text-[var(--text-secondary)]">{retailer.address}</p>}
        </div>
      </div>

      {showStockTakeForm && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Record Shelf Stock Take</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5">
                <span className="text-xs text-[var(--text-secondary)]">
                  {p.name} ({p.packSize})
                </span>
                <input
                  type="number"
                  min={0}
                  value={stockTakeQty[p.id] ?? ''}
                  onChange={(e) => setStockTakeQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                  className="w-16 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  placeholder="Qty"
                />
              </div>
            ))}
          </div>
          <button onClick={submitStockTake} disabled={busy} className="mt-3 rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save Stock Take'}
          </button>
        </div>
      )}

      {latestStockTake && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <h3 className="mb-2 px-1 text-sm font-semibold">Latest Shelf Stock ({new Date(latestStockTake.takenAt).toLocaleDateString()})</h3>
          <div className="flex flex-wrap gap-2 px-1">
            {latestStockTake.items.map((i) => (
              <span key={i.productId} className="rounded-full bg-[var(--page)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {i.product.name}: <span className="font-semibold text-[var(--text-primary)]">{i.qty}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <h3 className="mb-2 px-1 text-sm font-semibold">Recent Visits</h3>
          <DataTable
            keyFn={(v) => v.id}
            rows={retailer.visits}
            columns={[
              { header: 'Date', cell: (v) => new Date(v.plannedDate).toLocaleDateString() },
              { header: 'Status', cell: (v) => v.visitStatus },
              { header: 'Outcome', cell: (v) => v.outcome || '—' },
            ]}
          />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <h3 className="mb-2 px-1 text-sm font-semibold">Recent Orders</h3>
          <DataTable
            keyFn={(o) => o.id}
            rows={retailer.orders}
            columns={[
              { header: 'Order #', cell: (o) => o.orderNumber },
              { header: 'Date', cell: (o) => new Date(o.orderDate).toLocaleDateString() },
              { header: 'Amount', cell: (o) => `Rs ${o.totalAmount.toLocaleString()}`, align: 'right' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

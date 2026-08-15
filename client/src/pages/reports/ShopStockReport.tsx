import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ShopStockRow } from '../../types';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';

export default function ShopStockReport() {
  const [rows, setRows] = useState<ShopStockRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/reports/shop-stock').then((r) => setRows(r.data));
  }, []);

  const filtered = rows.filter((r) => r.retailerName.toLowerCase().includes(search.toLowerCase()));
  const totalUnits = filtered.reduce((s, r) => s + r.totalUnits, 0);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Shop Stock Report" meta={[{ label: 'Shops counted', value: String(rows.length) }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Shop Stock Report</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Shelf stock physically counted by the order booker on their last visit — one row per customer/wholesaler, most recent count.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <input
            placeholder="Search shop…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
          />
          <ExportButtons path="/reports/shop-stock" />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => (
          <div key={row.retailerId} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{row.retailerName}</span>
              <span className="text-xs text-[var(--muted)]">{new Date(row.takenAt).toLocaleDateString()}</span>
            </div>
            <div className="mb-2 text-xs text-[var(--text-secondary)]">
              {row.category.replace('_', ' ')} · {row.territory}
            </div>
            <div className="space-y-1">
              {row.items.map((i) => (
                <div key={i.productId} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">
                    {i.name} ({i.packSize})
                  </span>
                  <span className="tabular font-medium">{i.qty}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-xs">
              <span className="text-[var(--muted)]">Total units on shelf</span>
              <span className="tabular font-semibold">{row.totalUnits}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-sm text-[var(--text-secondary)]">
            No stock-takes recorded yet in scope.
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="print-card flex items-center justify-between rounded-xl border-2 border-[var(--text-primary)]/15 bg-[var(--page)] px-4 py-2.5 text-sm font-bold">
          <span>
            Total — {filtered.length} shop{filtered.length === 1 ? '' : 's'}
          </span>
          <span className="tabular">{totalUnits.toLocaleString()} units on shelf</span>
        </div>
      )}
    </div>
  );
}

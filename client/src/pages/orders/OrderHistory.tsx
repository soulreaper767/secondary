import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { Order } from '../../types';

export default function OrderHistory() {
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    api.get('/orders', { params: { page, pageSize } }).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
    });
  }, [page]);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Secondary Sales Order History" meta={[{ label: 'Total orders', value: String(total) }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Order History</h1>
        <PrintButton />
      </div>
      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(o) => o.id}
          rows={items}
          columns={[
            { header: 'Order #', cell: (o) => o.orderNumber },
            { header: 'Date', cell: (o) => new Date(o.orderDate).toLocaleDateString() },
            { header: 'Retailer', cell: (o) => o.retailer?.name },
            { header: 'Distributor', cell: (o) => o.distributor?.name },
            { header: 'Booked By', cell: (o) => o.obUser?.name },
            { header: 'Items', cell: (o) => o.items.length, align: 'center' },
            { header: 'Amount', cell: (o) => `Rs ${o.totalAmount.toLocaleString()}`, align: 'right' },
          ]}
        />
        <div className="flex items-center justify-between px-2 py-2 text-xs text-[var(--text-secondary)]">
          <span>
            {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-[var(--border)] px-2 py-1 disabled:opacity-40">
              Prev
            </button>
            <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-[var(--border)] px-2 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Order, Distributor, Retailer, User } from '../../types';

export default function OrderHistory() {
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [retailerId, setRetailerId] = useState<string | number>('');
  const [distributorId, setDistributorId] = useState<string | number>('');
  const [obUserId, setObUserId] = useState<string | number>('');

  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [obUsers, setObUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get('/retailers', { params: { pageSize: 200 } }).then((r) => setRetailers(r.data.items));
    api.get('/distributors').then((r) => setDistributors(r.data));
    api.get('/users', { params: { roleCode: 'OB' } }).then((r) => setObUsers(r.data));
  }, []);

  const filterParams = useMemo(
    () => ({ page, pageSize, retailerId: retailerId || undefined, distributorId: distributorId || undefined, obUserId: obUserId || undefined }),
    [page, retailerId, distributorId, obUserId]
  );

  useEffect(() => {
    api.get('/orders', { params: filterParams }).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
      setTotalValue(r.data.totalValue);
    });
  }, [filterParams]);

  useEffect(() => setPage(1), [retailerId, distributorId, obUserId]);

  const pageTotal = items.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Secondary Sales Order History" meta={[{ label: 'Total orders', value: String(total) }, { label: 'Total value', value: `Rs ${totalValue.toLocaleString()}` }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Order History</h1>
        <PrintButton />
      </div>

      <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Filter to one:</span>
        <SearchableSelect allLabel="All Shops" value={retailerId} onChange={setRetailerId} options={retailers.map((r) => ({ value: r.id, label: r.name }))} placeholder="Search shop…" />
        <SearchableSelect allLabel="All Distributors" value={distributorId} onChange={setDistributorId} options={distributors.map((d) => ({ value: d.id, label: d.name }))} placeholder="Search distributor…" />
        <SearchableSelect allLabel="All Order Bookers" value={obUserId} onChange={setObUserId} options={obUsers.map((u) => ({ value: u.id, label: u.name }))} placeholder="Search order booker…" />
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
          footer={['Total (all pages)', '', '', '', '', '', `Rs ${totalValue.toLocaleString()}`]}
        />
        <div className="flex items-center justify-between px-2 py-2 text-xs text-[var(--text-secondary)]">
          <span>
            {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} · this page: Rs {pageTotal.toLocaleString()}
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Retailer } from '../../types';

export default function RetailerList() {
  const [items, setItems] = useState<Retailer[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    api
      .get('/retailers', { params: { status: status || undefined, category: category || undefined, search: search || undefined, page, pageSize } })
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.total);
      });
  }, [status, category, search, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Retailer Universe</h1>
        <Link to="/universe/add" className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          + Add Retailer
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--series-1)]"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="UNTAPPED">Untapped</option>
          <option value="COVERED">Covered</option>
          <option value="PRODUCTIVE">Productive</option>
          <option value="NON_PRODUCTIVE">Non-Productive</option>
        </select>
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          <option value="GENERAL_TRADE">General Trade</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="HORECA">HoReCa</option>
          <option value="MODERN_TRADE">Modern Trade</option>
          <option value="KIRANA">Kirana</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.id}
          rows={items}
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/universe/${r.id}`} className="font-medium text-[var(--series-1)] hover:underline">{r.name}</Link> },
            { header: 'Category', cell: (r) => r.category.replace('_', ' ') },
            { header: 'Territory', cell: (r) => r.territoryNode?.name },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Added By', cell: (r) => r.addedByUser?.name },
            { header: 'Last Order', cell: (r) => (r.lastOrderDate ? new Date(r.lastOrderDate).toLocaleDateString() : '—') },
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

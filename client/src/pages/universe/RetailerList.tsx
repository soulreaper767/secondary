import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Retailer, TerritoryNode } from '../../types';

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL_STORE: 'General Store',
  PAN_SHOP: 'Pan Shop',
  KIRYANA_STORE: 'Kiryana Store',
  LARGE_STORE: 'Large Store',
  WHOLESALE: 'Wholesale',
  HORECA: 'HoReCa',
  MODERN_TRADE: 'Modern Trade',
};

const CHILLER_LABEL: Record<string, string> = {
  NONE: 'No Chiller',
  COMPANY: 'Company Chiller',
  COMPETITOR: 'Competitor Chiller',
  SHOP_OWNED: "Shop's Own Chiller",
};

export default function RetailerList() {
  const [items, setItems] = useState<Retailer[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [chillerType, setChillerType] = useState('');
  const [territoryNodeId, setTerritoryNodeId] = useState<string | number>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [territories, setTerritories] = useState<TerritoryNode[]>([]);
  const pageSize = 20;

  useEffect(() => {
    api.get('/territories').then((r) => setTerritories(r.data.filter((t: TerritoryNode) => t.level === 'TERRITORY')));
  }, []);

  useEffect(() => {
    api
      .get('/retailers', {
        params: { status: status || undefined, category: category || undefined, chillerType: chillerType || undefined, territoryNodeId: territoryNodeId || undefined, search: search || undefined, page, pageSize },
      })
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.total);
      });
  }, [status, category, chillerType, territoryNodeId, search, page]);

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
          <option value="">All shop types</option>
          {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={chillerType}
          onChange={(e) => {
            setPage(1);
            setChillerType(e.target.value);
          }}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          <option value="">All chiller status</option>
          {Object.entries(CHILLER_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <SearchableSelect
          allLabel="All Territories"
          value={territoryNodeId}
          onChange={(v) => {
            setPage(1);
            setTerritoryNodeId(v);
          }}
          options={territories.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Search territory…"
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.id}
          rows={items}
          columns={[
            { header: 'Name', cell: (r) => <Link to={`/universe/${r.id}`} className="font-medium text-[var(--series-1)] hover:underline">{r.name}</Link> },
            { header: 'Shop Type', cell: (r) => CATEGORY_LABEL[r.category] || r.category },
            { header: 'Territory', cell: (r) => r.territoryNode?.name },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            {
              header: 'Chiller',
              cell: (r) => (
                <span className="whitespace-nowrap text-xs">
                  {CHILLER_LABEL[r.chillerType] || r.chillerType}
                  {r.competitorExclusive && <span className="ml-1 rounded-full bg-[var(--status-critical)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-critical)]">Competitor-exclusive</span>}
                </span>
              ),
            },
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

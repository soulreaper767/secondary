import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';
import { ChartCard } from '../../components/ChartCard';
import { DataTable } from '../../components/DataTable';
import { KpiCard } from '../../components/KpiCard';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';
import { SearchableSelect } from '../../components/SearchableSelect';
import { CATEGORICAL, CHART_INK } from '../../lib/chartColors';
import { variantName } from '../../lib/product';
import { Distributor, Product, TerritoryNode, User } from '../../types';
import { BarChart3, RefreshCw, Sparkles, Receipt } from 'lucide-react';

interface ReportRow {
  key: string;
  label: string;
  orders: number;
  value: number;
  qty: number;
}

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `Rs ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `Rs ${(v / 1_000).toFixed(1)}K`;
  return `Rs ${Math.round(v)}`;
}

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function SecondarySalesReport() {
  const [groupBy, setGroupBy] = useState('distributor');
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [newVsRepeat, setNewVsRepeat] = useState({ newValue: 0, repeatValue: 0, newOrders: 0, repeatOrders: 0 });

  const [distributorId, setDistributorId] = useState<string | number>('');
  const [productId, setProductId] = useState<string | number>('');
  const [territoryNodeId, setTerritoryNodeId] = useState<string | number>('');
  const [obUserId, setObUserId] = useState<string | number>('');

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [territories, setTerritories] = useState<TerritoryNode[]>([]);
  const [obUsers, setObUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get('/distributors').then((r) => setDistributors(r.data));
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
    api.get('/territories').then((r) => setTerritories(r.data.filter((t: TerritoryNode) => t.level === 'TERRITORY')));
    api.get('/users', { params: { roleCode: 'OB' } }).then((r) => setObUsers(r.data));
  }, []);

  const filterParams = useMemo(
    () => ({
      groupBy,
      from,
      to,
      distributorId: distributorId || undefined,
      productId: productId || undefined,
      territoryNodeId: territoryNodeId || undefined,
      obUserId: obUserId || undefined,
    }),
    [groupBy, from, to, distributorId, productId, territoryNodeId, obUserId]
  );

  useEffect(() => {
    api.get('/reports/secondary-sales', { params: filterParams }).then((r) => {
      setRows(r.data.rows);
      setTotalValue(r.data.totalValue);
      setTotalOrders(r.data.totalOrders);
      setNewVsRepeat(r.data.newVsRepeat);
    });
  }, [filterParams]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const activeFilterCount = [distributorId, productId, territoryNodeId, obUserId].filter(Boolean).length;

  return (
    <div className="print-area space-y-4">
      <PrintHeader
        documentTitle="Secondary Sales Report"
        meta={[
          { label: 'Period', value: `${from} to ${to}` },
          { label: 'Grouped by', value: groupBy },
          { label: 'Total value', value: fmtCurrency(totalValue) },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Secondary Sales Report</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {totalOrders.toLocaleString()} orders · {fmtCurrency(totalValue)} total
            {activeFilterCount > 0 && <span className="text-[var(--series-1)]"> · {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
            <option value="distributor">By Distributor</option>
            <option value="sku">By SKU</option>
            <option value="territory">By Territory</option>
            <option value="obUser">By Order Booker</option>
          </select>
          <ExportButtons path="/reports/secondary-sales" params={filterParams} />
          <PrintButton />
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Filter to one:</span>
        <SearchableSelect
          allLabel="All Distributors"
          value={distributorId}
          onChange={setDistributorId}
          options={distributors.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Search distributor…"
        />
        <SearchableSelect
          allLabel="All SKUs"
          value={productId}
          onChange={setProductId}
          options={products.map((p) => ({ value: p.id, label: variantName(p), sublabel: p.skuCode }))}
          placeholder="Search SKU…"
        />
        <SearchableSelect
          allLabel="All Territories"
          value={territoryNodeId}
          onChange={setTerritoryNodeId}
          options={territories.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Search territory…"
        />
        <SearchableSelect
          allLabel="All Order Bookers"
          value={obUserId}
          onChange={setObUserId}
          options={obUsers.map((u) => ({ value: u.id, label: u.name }))}
          placeholder="Search order booker…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Value" value={fmtCurrency(totalValue)} icon={BarChart3} accent="#2a78d6" />
        <KpiCard label="New Business" value={fmtCurrency(newVsRepeat.newValue)} icon={Sparkles} accent="#1baf7a" sub={`${newVsRepeat.newOrders} orders`} />
        <KpiCard label="Repeat Business" value={fmtCurrency(newVsRepeat.repeatValue)} icon={RefreshCw} accent="#eda100" sub={`${newVsRepeat.repeatOrders} orders`} />
        <KpiCard label="Total Orders" value={totalOrders.toLocaleString()} icon={Receipt} accent="#4a3aa7" />
      </div>

      <ChartCard title="Sales Value" sub={`Grouped by ${groupBy}`} icon={BarChart3} accent="#2a78d6">
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 32)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} tickFormatter={(v) => fmtCurrency(v)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
            <Bar dataKey="value" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.key}
          rows={rows}
          columns={[
            { header: groupBy.charAt(0).toUpperCase() + groupBy.slice(1), cell: (r) => r.label },
            { header: 'Orders', cell: (r) => r.orders, align: 'right' },
            { header: 'Qty', cell: (r) => r.qty, align: 'right' },
            { header: 'Value', cell: (r) => `Rs ${r.value.toLocaleString()}`, align: 'right' },
          ]}
          footer={['Total', totalOrders.toLocaleString(), totalQty.toLocaleString(), `Rs ${totalValue.toLocaleString()}`]}
        />
      </div>
    </div>
  );
}

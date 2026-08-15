import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { KpiCard } from '../components/KpiCard';
import { ChartCard } from '../components/ChartCard';
import { DataTable } from '../components/DataTable';
import { TerritoryTree } from '../components/TerritoryTree';
import { DashboardSummary, TerritoryNode } from '../types';
import { CATEGORICAL, CHART_INK, UNIVERSE_STATUS_COLOR } from '../lib/chartColors';
import {
  Store,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Sparkles,
  RefreshCw,
  Boxes,
  Target as TargetIcon,
  Trophy,
  LineChart as LineChartIcon,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Route as RouteIcon,
  Network,
} from 'lucide-react';

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `Rs ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `Rs ${(v / 1_000).toFixed(1)}K`;
  return `Rs ${Math.round(v)}`;
}

const MANAGEMENT = ['ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM', 'TSO'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<{ date: string; value: number }[]>([]);
  const [skuRows, setSkuRows] = useState<{ label: string; value: number }[]>([]);
  const [tree, setTree] = useState<TerritoryNode[]>([]);

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data));
    api.get('/reports/secondary-sales/trend').then((r) => setTrend(r.data));
    api.get('/reports/secondary-sales', { params: { groupBy: 'sku' } }).then((r) => setSkuRows(r.data.rows.slice(0, 8)));
    if (user && MANAGEMENT.includes(user.role.code)) {
      api.get('/territories/tree').then((r) => setTree(r.data));
    }
  }, [user?.id]);

  if (!summary || !user) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading dashboard…</div>;
  }

  const funnelData = [
    { key: 'UNTAPPED', label: 'Untapped', value: summary.universe.untapped },
    { key: 'COVERED', label: 'Covered', value: summary.universe.covered },
    { key: 'PRODUCTIVE', label: 'Productive', value: summary.universe.productive },
    { key: 'NON_PRODUCTIVE', label: 'Non-Productive', value: summary.universe.nonProductive },
  ];
  const maxFunnel = Math.max(...funnelData.map((f) => f.value), 1);

  const achievementPct = summary.target ? Math.min(999, (summary.target.achievedValue / (summary.target.targetValue || 1)) * 100) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] p-5 text-white shadow-sm" style={{ background: 'linear-gradient(120deg, #1d4ed8 0%, #2a78d6 45%, #4a3aa7 100%)' }}>
        <h1 className="text-xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-white/85">
          {user.territoryNode ? `Scope: ${user.territoryNode.name}` : `Scope: ${user.role.code === 'ADMIN' ? 'Entire organization' : 'National'}`} · {user.role.name}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          <Store size={13} /> Retail Universe
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Universe" value={summary.universe.total.toLocaleString()} icon={Store} accent="#898781" sub={`${summary.distributorCount} distributors`} />
          <KpiCard label="Covered" value={summary.universe.covered.toLocaleString()} icon={CheckCircle2} accent="#eda100" sub="visited, no order yet" />
          <KpiCard label="Productive" value={summary.universe.productive.toLocaleString()} icon={TrendingUp} accent="#0ca30c" sub="ordered within 30d" />
          <KpiCard label="Non-Productive" value={summary.universe.nonProductive.toLocaleString()} icon={AlertTriangle} accent="#d03b3b" sub="lapsed 30d+" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          <Wallet size={13} /> Sales Performance (MTD)
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Secondary Sales" value={fmtCurrency(summary.mtdSalesValue)} icon={Wallet} accent="#2a78d6" sub={`${summary.mtdOrderCount} orders`} />
          <KpiCard label="New Business" value={fmtCurrency(summary.newVsRepeat.newValue)} icon={Sparkles} accent="#1baf7a" sub={`${summary.newVsRepeat.newShopCount} new shops`} />
          <KpiCard label="Repeat Business" value={fmtCurrency(summary.newVsRepeat.repeatValue)} icon={RefreshCw} accent="#eda100" />
          <KpiCard label="Cases Sold" value={summary.casesSoldMtd.toLocaleString()} icon={Boxes} accent="#4a3aa7" />
          <KpiCard
            label="Target Achievement"
            value={achievementPct !== null ? `${achievementPct.toFixed(0)}%` : '—'}
            icon={TargetIcon}
            accent="#e87ba4"
            sub={summary.target ? `of Rs ${(summary.target.targetValue / 1_000_000).toFixed(1)}M` : 'No target set'}
          />
          <KpiCard label="Incentive Earned" value={summary.incentive ? fmtCurrency(summary.incentive.incentiveAmount) : '—'} icon={Trophy} accent="#e34948" sub={summary.incentive ? `${summary.incentive.schemes.length} scheme(s)` : 'No scheme'} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Secondary Sales Trend" sub="Last 30 days" icon={LineChartIcon} accent="#2a78d6">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_INK.muted }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCurrency(v)} width={56} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Line type="monotone" dataKey="value" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top SKUs by Value" sub="Current filter scope" icon={BarChart3} accent="#eb6834">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={skuRows} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} tickFormatter={(v) => fmtCurrency(v)} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Bar dataKey="value" fill={CATEGORICAL[1]} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Universe Funnel" sub="Untapped → Productive" icon={PieChartIcon} accent="#1baf7a">
          <div className="space-y-2.5 py-1">
            {funnelData.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-secondary)]">{f.label}</span>
                  <span className="tabular font-semibold">{f.value.toLocaleString()}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--page)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(f.value / maxFunnel) * 100}%`, background: UNIVERSE_STATUS_COLOR[f.key] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {summary.leaderboard.length > 0 && (
          <ChartCard title="Team Leaderboard" sub="MTD secondary sales by direct report" icon={Users} accent="#4a3aa7">
            <DataTable
              keyFn={(r) => r.id}
              rows={summary.leaderboard}
              columns={[
                { header: 'Name', cell: (r) => r.name },
                { header: 'Role', cell: (r) => r.role },
                { header: 'MTD Sales', cell: (r) => fmtCurrency(r.mtdSales), align: 'right' },
              ]}
            />
          </ChartCard>
        )}

        {summary.pjpCompliance && (
          <ChartCard title="PJP Compliance" sub="Last 30 days" icon={RouteIcon} accent="#eda100">
            <div className="flex items-center gap-6 py-2">
              <div>
                <div className="tabular text-3xl font-bold">{summary.pjpCompliance.compliancePct.toFixed(0)}%</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {summary.pjpCompliance.visited} of {summary.pjpCompliance.planned} planned visits
                </div>
              </div>
            </div>
          </ChartCard>
        )}

        {tree.length > 0 && (
          <ChartCard title="Territory Drill-down" sub="Click to expand and see subtree totals" icon={Network} accent="#2a78d6">
            <TerritoryTree nodes={tree} />
          </ChartCard>
        )}
      </div>
    </div>
  );
}

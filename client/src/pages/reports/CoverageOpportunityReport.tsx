import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';
import { ChartCard } from '../../components/ChartCard';
import { KpiCard } from '../../components/KpiCard';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';
import { CoverageOpportunityRow } from '../../types';
import { CATEGORICAL, CHART_INK } from '../../lib/chartColors';
import { Target, MapPinned, TrendingUp, Store } from 'lucide-react';

export default function CoverageOpportunityReport() {
  const [rows, setRows] = useState<CoverageOpportunityRow[]>([]);

  useEffect(() => {
    api.get('/reports/coverage-opportunity').then((r) => setRows(r.data));
  }, []);

  const totalPotential = rows.reduce((s, r) => s + r.marketPotential, 0);
  const totalRecorded = rows.reduce((s, r) => s + r.recordedUniverse, 0);
  const totalGap = rows.reduce((s, r) => s + r.expansionGap, 0);
  const chartData = rows.slice(0, 10).map((r) => ({ label: r.territoryName.replace(/^.*Territory/, 'Territory'), gap: r.expansionGap }));

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Coverage Opportunity Report" meta={[{ label: 'Territories', value: String(rows.length) }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Coverage Opportunity</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Recorded universe vs. estimated true market size, ranked by expansion gap — where to focus outlet capture next.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <ExportButtons path="/reports/coverage-opportunity" />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Market Potential" value={totalPotential.toLocaleString()} icon={Target} accent="#4a3aa7" sub="estimated addressable shops" />
        <KpiCard label="Recorded Universe" value={totalRecorded.toLocaleString()} icon={Store} accent="#2a78d6" />
        <KpiCard label="Overall Penetration" value={totalPotential ? `${((totalRecorded / totalPotential) * 100).toFixed(0)}%` : '—'} icon={TrendingUp} accent="#0ca30c" />
        <KpiCard label="Total Expansion Gap" value={totalGap.toLocaleString()} icon={MapPinned} accent="#d03b3b" sub="shops not yet in the system" />
      </div>

      <ChartCard title="Biggest Expansion Gaps" sub="Top 10 territories by shops not yet captured (Market Potential − Recorded Universe)" icon={MapPinned} accent="#d03b3b">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
            <Bar dataKey="gap" fill={CATEGORICAL[7]} radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.territoryId}
          rows={rows}
          columns={[
            { header: 'Territory', cell: (r) => r.territoryName },
            { header: 'Market Potential', cell: (r) => r.marketPotential.toLocaleString(), align: 'right' },
            { header: 'Recorded', cell: (r) => r.recordedUniverse.toLocaleString(), align: 'right' },
            { header: 'Productive', cell: (r) => r.productive.toLocaleString(), align: 'right' },
            { header: 'Untapped (in system)', cell: (r) => r.untappedInSystem.toLocaleString(), align: 'right' },
            { header: 'Penetration', cell: (r) => (r.penetrationPct !== null ? `${r.penetrationPct.toFixed(0)}%` : '—'), align: 'right' },
            {
              header: 'Expansion Gap',
              cell: (r) => <span className={r.expansionGap > 0 ? 'font-semibold text-[var(--status-critical)]' : ''}>{r.expansionGap.toLocaleString()}</span>,
              align: 'right',
            },
          ]}
        />
      </div>
    </div>
  );
}

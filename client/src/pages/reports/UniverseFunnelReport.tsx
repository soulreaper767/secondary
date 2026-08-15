import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../api/client';
import { ChartCard } from '../../components/ChartCard';
import { KpiCard } from '../../components/KpiCard';
import { PrintButton, PrintHeader } from '../../components/Print';
import { UniverseSummary } from '../../types';
import { UNIVERSE_STATUS_COLOR } from '../../lib/chartColors';
import { Store, CheckCircle2, TrendingUp, AlertTriangle, PieChart as PieChartIcon } from 'lucide-react';

export default function UniverseFunnelReport() {
  const [summary, setSummary] = useState<UniverseSummary | null>(null);

  useEffect(() => {
    api.get('/reports/universe-funnel').then((r) => setSummary(r.data));
  }, []);

  if (!summary) return <div className="text-sm text-[var(--text-secondary)]">Loading…</div>;

  const pieData = [
    { name: 'Untapped', key: 'UNTAPPED', value: summary.untapped },
    { name: 'Covered', key: 'COVERED', value: summary.covered },
    { name: 'Productive', key: 'PRODUCTIVE', value: summary.productive },
    { name: 'Non-Productive', key: 'NON_PRODUCTIVE', value: summary.nonProductive },
  ];

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Universe Funnel Report" meta={[{ label: 'Total universe', value: summary.total.toLocaleString() }]} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Universe Funnel Report</h1>
          <p className="text-sm text-[var(--text-secondary)]">How the total retail universe converts from untapped to productive.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Universe" value={summary.total.toLocaleString()} icon={Store} accent="#898781" />
        <KpiCard label="Covered" value={summary.covered.toLocaleString()} icon={CheckCircle2} accent="#eda100" sub={`${summary.total ? ((summary.covered / summary.total) * 100).toFixed(0) : 0}%`} />
        <KpiCard label="Productive" value={summary.productive.toLocaleString()} icon={TrendingUp} accent="#0ca30c" sub={`${summary.total ? ((summary.productive / summary.total) * 100).toFixed(0) : 0}%`} />
        <KpiCard label="Non-Productive" value={summary.nonProductive.toLocaleString()} icon={AlertTriangle} accent="#d03b3b" sub="needs senior visit" />
      </div>

      <ChartCard title="Universe Composition" sub="Share of total retail universe by lifecycle stage" icon={PieChartIcon} accent="#e87ba4">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
              {pieData.map((d) => (
                <Cell key={d.key} fill={UNIVERSE_STATUS_COLOR[d.key]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

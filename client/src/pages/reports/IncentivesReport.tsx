import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { KpiCard } from '../../components/KpiCard';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { Target, TrendingUp, Trophy, Layers } from 'lucide-react';

interface Earning {
  id: number;
  periodMonth: number;
  periodYear: number;
  achievedValue: number;
  targetValue: number;
  achievementPct: number;
  incentiveAmount: number;
  metricValue: number | null;
  scheme: { name: string; basis: string };
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BASIS_LABEL: Record<string, string> = {
  PERCENT_OF_SALES: '% of Sales',
  SLAB_ON_ACHIEVEMENT: 'Achievement Slab',
  PER_CASE_SOLD: 'Per Case Sold',
  PER_NEW_PRODUCTIVE_SHOP: 'Per New Shop',
};

export default function IncentivesReport() {
  const [earnings, setEarnings] = useState<Earning[]>([]);

  useEffect(() => {
    api.get('/incentives/earnings').then((r) => setEarnings(r.data));
  }, []);

  const currentPeriod = earnings[0] ? { month: earnings[0].periodMonth, year: earnings[0].periodYear } : null;
  const currentRows = currentPeriod ? earnings.filter((e) => e.periodMonth === currentPeriod.month && e.periodYear === currentPeriod.year) : [];
  const totalIncentive = currentRows.reduce((s, e) => s + e.incentiveAmount, 0);
  const target = currentRows[0];

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Incentive Earnings Report" meta={currentPeriod ? [{ label: 'Period', value: `${MONTHS[currentPeriod.month]} ${currentPeriod.year}` }] : []} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Incentive Report</h1>
          <p className="text-sm text-[var(--text-secondary)]">Target achievement and every stacked incentive scheme's payout, by period.</p>
        </div>
        <PrintButton />
      </div>

      {target && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Target (Value)" value={`Rs ${target.targetValue.toLocaleString()}`} icon={Target} accent="#2a78d6" />
          <KpiCard label="Achieved (Value)" value={`Rs ${target.achievedValue.toLocaleString()}`} icon={TrendingUp} accent="#1baf7a" sub={`${target.achievementPct.toFixed(0)}% of target`} />
          <KpiCard label="Active Schemes" value={String(currentRows.length)} icon={Layers} accent="#4a3aa7" />
          <KpiCard label="Total Incentive" value={`Rs ${totalIncentive.toLocaleString()}`} icon={Trophy} accent="#eda100" />
        </div>
      )}

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(e) => e.id}
          rows={earnings}
          emptyText="No incentive earnings computed yet."
          columns={[
            { header: 'Period', cell: (e) => `${MONTHS[e.periodMonth]} ${e.periodYear}` },
            { header: 'Scheme', cell: (e) => e.scheme.name },
            { header: 'Basis', cell: (e) => BASIS_LABEL[e.scheme.basis] || e.scheme.basis },
            { header: 'Metric', cell: (e) => (e.metricValue !== null ? e.metricValue.toLocaleString() : '—'), align: 'right' },
            { header: 'Incentive', cell: (e) => `Rs ${e.incentiveAmount.toLocaleString()}`, align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}

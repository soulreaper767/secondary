import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { KpiCard } from '../../components/KpiCard';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';
import { SearchableSelect } from '../../components/SearchableSelect';
import { User } from '../../types';
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
const MANAGEMENT = ['ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM', 'TSO'];

export default function IncentivesReport() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | number>('');

  const canPickUser = user && MANAGEMENT.includes(user.role.code);

  useEffect(() => {
    if (canPickUser) api.get('/users').then((r) => setUsers(r.data.filter((u: User) => u.role.code !== 'ADMIN' && u.role.code !== 'DISTRIBUTOR')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get('/incentives/earnings', { params: { userId: userId || undefined } }).then((r) => setEarnings(r.data));
  }, [userId]);

  const currentPeriod = earnings[0] ? { month: earnings[0].periodMonth, year: earnings[0].periodYear } : null;
  const currentRows = currentPeriod ? earnings.filter((e) => e.periodMonth === currentPeriod.month && e.periodYear === currentPeriod.year) : [];
  const totalIncentive = currentRows.reduce((s, e) => s + e.incentiveAmount, 0);
  const target = currentRows[0];
  const grandTotalIncentive = earnings.reduce((s, e) => s + e.incentiveAmount, 0);

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Incentive Earnings Report" meta={currentPeriod ? [{ label: 'Period', value: `${MONTHS[currentPeriod.month]} ${currentPeriod.year}` }] : []} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Incentive Report</h1>
          <p className="text-sm text-[var(--text-secondary)]">Target achievement and every stacked incentive scheme's payout, by period.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <ExportButtons path="/incentives/earnings" params={{ userId: userId || undefined }} />
          <PrintButton />
        </div>
      </div>

      {canPickUser && (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">View for one person:</span>
          <SearchableSelect
            allLabel="Myself"
            value={userId}
            onChange={setUserId}
            options={users.map((u) => ({ value: u.id, label: u.name, sublabel: u.role.code }))}
            placeholder="Search person…"
          />
        </div>
      )}

      {target && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Target (Value)" value={`Rs ${target.targetValue.toLocaleString()}`} icon={Target} accent="#2a78d6" />
          <KpiCard label="Achieved (Value)" value={`Rs ${target.achievedValue.toLocaleString()}`} icon={TrendingUp} accent="#1baf7a" sub={`${target.achievementPct.toFixed(0)}% of target`} />
          <KpiCard label="Active Schemes" value={String(currentRows.length)} icon={Layers} accent="#4a3aa7" />
          <KpiCard label="Total Incentive (this period)" value={`Rs ${totalIncentive.toLocaleString()}`} icon={Trophy} accent="#eda100" />
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
          footer={['Total (all periods shown)', '', '', '', `Rs ${grandTotalIncentive.toLocaleString()}`]}
        />
      </div>
    </div>
  );
}

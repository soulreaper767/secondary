import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { KpiCard } from '../../components/KpiCard';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';
import { ObEfficiencyRow } from '../../types';
import { Users, Route as RouteIcon, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ObEfficiencyReport() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ObEfficiencyRow[]>([]);

  useEffect(() => {
    api.get('/reports/ob-efficiency', { params: { days } }).then((r) => setRows(r.data.rows));
  }, [days]);

  const avgCompliance = rows.length ? rows.reduce((s, r) => s + r.compliancePct, 0) / rows.length : 0;
  const totalRouteShops = rows.reduce((s, r) => s + r.routeSize, 0);
  const totalUntapped = rows.reduce((s, r) => s + r.untappedInTerritory, 0);
  const overloaded = rows.filter((r) => r.routeSize > 0 && r.avgVisitsPerDay < r.routeSize / 6 / 2).length; // covering less than half their weekly route pace

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="OB Efficiency Report" meta={[{ label: 'Window', value: `Last ${days} days` }, { label: 'Order Bookers', value: String(rows.length) }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">OB Efficiency</h1>
          <p className="text-sm text-[var(--text-secondary)]">Daily field coverage, route load, and remaining untapped opportunity — where to reinforce or rebalance.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <ExportButtons path="/reports/ob-efficiency" params={{ days }} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Order Bookers" value={rows.length.toLocaleString()} icon={Users} accent="#2a78d6" />
        <KpiCard label="Avg Compliance" value={`${avgCompliance.toFixed(0)}%`} icon={CheckCircle2} accent="#0ca30c" sub="planned vs. actual visits" />
        <KpiCard label="Total Route Load" value={totalRouteShops.toLocaleString()} icon={RouteIcon} accent="#4a3aa7" sub="shops across all standing routes" />
        <KpiCard label="Under-covering" value={overloaded.toLocaleString()} icon={AlertTriangle} accent="#d03b3b" sub="visiting under half their route pace" />
      </div>

      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.obId}
          rows={rows}
          columns={[
            { header: 'Order Booker', cell: (r) => r.obName },
            { header: 'Territory', cell: (r) => r.territory },
            { header: 'Route Size', cell: (r) => r.routeSize.toLocaleString(), align: 'right' },
            { header: 'Planned Visits', cell: (r) => r.plannedVisits.toLocaleString(), align: 'right' },
            { header: 'Actual Visits', cell: (r) => r.actualVisits.toLocaleString(), align: 'right' },
            {
              header: 'Compliance',
              cell: (r) => <span className={r.compliancePct < 60 ? 'font-semibold text-[var(--status-critical)]' : 'font-medium text-[var(--status-good)]'}>{r.compliancePct.toFixed(0)}%</span>,
              align: 'right',
            },
            { header: 'Avg/Day', cell: (r) => r.avgVisitsPerDay.toFixed(1), align: 'right' },
            { header: 'Orders Booked', cell: (r) => r.ordersBooked.toLocaleString(), align: 'right' },
            {
              header: 'Untapped in Territory',
              cell: (r) => <span className={r.untappedInTerritory > 10 ? 'font-semibold text-[var(--status-warning)]' : ''}>{r.untappedInTerritory.toLocaleString()}</span>,
              align: 'right',
            },
          ]}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Sorted by untapped opportunity remaining in each OB's territory — highest first. Pair this with Coverage Opportunity to decide where extra order bookers would help most.
      </p>
    </div>
  );
}

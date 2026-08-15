import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../../api/client';
import { ChartCard } from '../../components/ChartCard';
import { KpiCard } from '../../components/KpiCard';
import { PrintButton, PrintHeader } from '../../components/Print';
import { ExportButtons } from '../../components/ExportButtons';
import { UniverseSegmentation } from '../../types';
import { CATEGORICAL, CHART_INK } from '../../lib/chartColors';
import { Store, Snowflake, ShieldAlert, Layers } from 'lucide-react';

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
const CHILLER_COLOR: Record<string, string> = {
  NONE: '#898781',
  COMPANY: '#0ca30c',
  COMPETITOR: '#d03b3b',
  SHOP_OWNED: '#eda100',
};

export default function UniverseSegmentationReport() {
  const [data, setData] = useState<UniverseSegmentation | null>(null);

  useEffect(() => {
    api.get('/reports/universe-segmentation').then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-sm text-[var(--text-secondary)]">Loading…</div>;

  const categoryData = data.byCategory.map((r) => ({ label: CATEGORY_LABEL[r.key] || r.key, value: r.count }));
  const chillerData = data.byChiller.map((r) => ({ key: r.key, label: CHILLER_LABEL[r.key] || r.key, value: r.count }));
  const companyChiller = data.byChiller.find((r) => r.key === 'COMPANY')?.count || 0;
  const competitorChiller = data.byChiller.find((r) => r.key === 'COMPETITOR')?.count || 0;

  return (
    <div className="print-area space-y-4">
      <PrintHeader documentTitle="Universe Segmentation Report" meta={[{ label: 'Total shops', value: String(data.total) }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Universe Segmentation</h1>
          <p className="text-sm text-[var(--text-secondary)]">Shop type, cold-chain presence, and competitive exposure across the recorded universe.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <ExportButtons path="/reports/universe-segmentation" />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Shops" value={data.total.toLocaleString()} icon={Store} accent="#2a78d6" />
        <KpiCard label="Company Chiller" value={companyChiller.toLocaleString()} icon={Snowflake} accent="#0ca30c" sub={`${data.total ? ((companyChiller / data.total) * 100).toFixed(0) : 0}% of universe`} />
        <KpiCard label="Competitor Chiller" value={competitorChiller.toLocaleString()} icon={Snowflake} accent="#d03b3b" sub={`${data.total ? ((competitorChiller / data.total) * 100).toFixed(0) : 0}% of universe`} />
        <KpiCard label="Competitor-Exclusive" value={data.competitorExclusive.toLocaleString()} icon={ShieldAlert} accent="#e34948" sub="stock rival brand only" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="By Shop Type" sub="Recorded universe breakdown" icon={Store} accent="#2a78d6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Bar dataKey="value" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Chiller Status" sub="Cold-chain / merchandising presence" icon={Layers} accent="#eda100">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chillerData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chillerData.map((d) => (
                  <Cell key={d.key} fill={CHILLER_COLOR[d.key] || CATEGORICAL[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

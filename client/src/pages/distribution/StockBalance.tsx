import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { Distributor, Product } from '../../types';
import { variantName } from '../../lib/product';

interface BalanceRow {
  id: number;
  qty: number;
  distributor: { id: number; name: string };
  product: Product;
}

export default function StockBalance() {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [distributorId, setDistributorId] = useState('');

  useEffect(() => {
    api.get('/distributors').then((r) => setDistributors(r.data));
  }, []);

  useEffect(() => {
    api.get('/stock/balance', { params: distributorId ? { distributorId } : {} }).then((r) => setRows(r.data));
  }, [distributorId]);

  const selectedDistributor = distributors.find((d) => String(d.id) === distributorId);

  return (
    <div className="print-area space-y-4">
      <PrintHeader
        documentTitle="Distributor Stock Balance Statement"
        party={selectedDistributor ? { label: 'Distributor', name: selectedDistributor.name, code: selectedDistributor.code, address: selectedDistributor.address, phone: selectedDistributor.phone } : null}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Distributor Stock Balance</h1>
          <p className="text-sm text-[var(--text-secondary)]">Live inventory at each distributor, by SKU.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
            <option value="">All distributors</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <PrintButton />
        </div>
      </div>
      <div className="print-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(r) => r.id}
          rows={rows}
          columns={[
            { header: 'Distributor', cell: (r) => r.distributor.name },
            { header: 'SKU', cell: (r) => variantName(r.product) },
            { header: 'SKU Code', cell: (r) => r.product.skuCode },
            {
              header: 'Stock Qty',
              align: 'right',
              cell: (r) => (
                <span className={r.qty < 100 ? 'font-semibold text-[var(--status-critical)]' : 'font-medium'}>{r.qty.toLocaleString()}</span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

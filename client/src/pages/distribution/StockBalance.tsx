import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { PrintButton, PrintHeader } from '../../components/Print';
import { SearchableSelect } from '../../components/SearchableSelect';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [distributorId, setDistributorId] = useState<string | number>('');
  const [productId, setProductId] = useState<string | number>('');

  useEffect(() => {
    api.get('/distributors').then((r) => setDistributors(r.data));
    api.get('/products', { params: { active: true } }).then((r) => setProducts(r.data));
  }, []);

  useEffect(() => {
    api.get('/stock/balance', { params: { distributorId: distributorId || undefined, productId: productId || undefined } }).then((r) => setRows(r.data));
  }, [distributorId, productId]);

  const selectedDistributor = distributors.find((d) => String(d.id) === String(distributorId));
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="print-area space-y-4">
      <PrintHeader
        documentTitle="Distributor Stock Balance Statement"
        party={selectedDistributor ? { label: 'Distributor', name: selectedDistributor.name, code: selectedDistributor.code, address: selectedDistributor.address, phone: selectedDistributor.phone } : null}
        meta={[{ label: 'Total stock (filtered)', value: totalQty.toLocaleString() }]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Distributor Stock Balance</h1>
          <p className="text-sm text-[var(--text-secondary)]">Live inventory at each distributor, by SKU.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <SearchableSelect allLabel="All Distributors" value={distributorId} onChange={setDistributorId} options={distributors.map((d) => ({ value: d.id, label: d.name }))} placeholder="Search distributor…" />
          <SearchableSelect allLabel="All SKUs" value={productId} onChange={setProductId} options={products.map((p) => ({ value: p.id, label: variantName(p), sublabel: p.skuCode }))} placeholder="Search SKU…" />
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
          footer={['Total', '', '', totalQty.toLocaleString()]}
        />
      </div>
    </div>
  );
}

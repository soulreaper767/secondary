import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Product } from '../../types';

const emptyForm = { name: '', skuCode: '', category: '', brand: '', packSize: '', mrp: 0, distributorPrice: 0 };

export default function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/products').then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/products', { ...form, mrp: Number(form.mrp), distributorPrice: Number(form.distributorPrice) });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create product');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: number) {
    await api.delete(`/products/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Products / SKUs</h1>
          <p className="text-sm text-[var(--text-secondary)]">{items.length} products</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="SKU code (unique)" value={form.skuCode} onChange={(e) => setForm({ ...form, skuCode: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Pack size (e.g. 500ml)" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required type="number" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required type="number" placeholder="Distributor price" value={form.distributorPrice} onChange={(e) => setForm({ ...form, distributorPrice: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          {error && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{error}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Product'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <DataTable
          keyFn={(p) => p.id}
          rows={items}
          columns={[
            { header: 'Name', cell: (p) => p.name },
            { header: 'SKU', cell: (p) => p.skuCode },
            { header: 'Brand', cell: (p) => p.brand },
            { header: 'Pack', cell: (p) => p.packSize },
            { header: 'MRP', cell: (p) => `Rs ${p.mrp}`, align: 'right' },
            { header: 'Dist. Price', cell: (p) => `Rs ${p.distributorPrice}`, align: 'right' },
            { header: 'Active', cell: (p) => (p.active ? 'Yes' : 'No') },
            { header: '', cell: (p) => p.active && <button onClick={() => deactivate(p.id)} className="text-xs text-[var(--status-critical)] hover:underline">Deactivate</button> },
          ]}
        />
      </div>
    </div>
  );
}

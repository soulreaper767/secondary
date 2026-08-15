import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ProductFamily } from '../../types';
import { PackagePlus, Package } from 'lucide-react';

const emptyFamilyForm = { name: '', brand: '', category: '', description: '' };
const emptyVariantForm = { packaging: 'PET', size: '', skuCode: '', mrp: 0, distributorPrice: 0 };

export default function AdminProducts() {
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyForm, setFamilyForm] = useState<any>(emptyFamilyForm);
  const [familyError, setFamilyError] = useState('');
  const [busy, setBusy] = useState(false);

  const [variantFamilyId, setVariantFamilyId] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<any>(emptyVariantForm);
  const [variantError, setVariantError] = useState('');

  function load() {
    api.get('/products/families').then((r) => setFamilies(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function submitFamily(e: FormEvent) {
    e.preventDefault();
    setFamilyError('');
    setBusy(true);
    try {
      await api.post('/products/families', familyForm);
      setFamilyForm(emptyFamilyForm);
      setShowFamilyForm(false);
      load();
    } catch (err: any) {
      setFamilyError(err.response?.data?.error || 'Failed to create product family');
    } finally {
      setBusy(false);
    }
  }

  async function submitVariant(e: FormEvent) {
    e.preventDefault();
    if (!variantFamilyId) return;
    setVariantError('');
    setBusy(true);
    try {
      await api.post('/products', { ...variantForm, familyId: variantFamilyId, mrp: Number(variantForm.mrp), distributorPrice: Number(variantForm.distributorPrice) });
      setVariantForm(emptyVariantForm);
      setVariantFamilyId(null);
      load();
    } catch (err: any) {
      setVariantError(err.response?.data?.error || 'Failed to create variant');
    } finally {
      setBusy(false);
    }
  }

  async function deactivateVariant(id: number) {
    await api.delete(`/products/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Products</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Each flavor is a product document — add new packaging/size variants under it any time without touching the base item.
          </p>
        </div>
        <button onClick={() => setShowFamilyForm((s) => !s)} className="flex items-center gap-1.5 rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          <Package size={14} /> {showFamilyForm ? 'Cancel' : 'New Flavor'}
        </button>
      </div>

      {showFamilyForm && (
        <form onSubmit={submitFamily} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Flavor name (e.g. Cola)" value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Brand (e.g. Zalmi)" value={familyForm.brand} onChange={(e) => setFamilyForm({ ...familyForm, brand: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input required placeholder="Category" value={familyForm.category} onChange={(e) => setFamilyForm({ ...familyForm, category: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input placeholder="Description (optional)" value={familyForm.description} onChange={(e) => setFamilyForm({ ...familyForm, description: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          {familyError && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{familyError}</p>}
          <button disabled={busy} className="col-span-full w-fit rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Flavor'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {families.map((f) => (
          <div key={f.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold">
                    {f.brand} {f.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[var(--page)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">{f.category}</span>
                </div>
                {f.description && <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{f.description}</p>}
              </div>
              <button
                onClick={() => {
                  setVariantFamilyId(variantFamilyId === f.id ? null : f.id);
                  setVariantForm(emptyVariantForm);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--page)]"
              >
                <PackagePlus size={13} /> {variantFamilyId === f.id ? 'Cancel' : 'Add Variant'}
              </button>
            </div>

            {variantFamilyId === f.id && (
              <form onSubmit={submitVariant} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--page)] p-3 sm:grid-cols-3 lg:grid-cols-6">
                <select value={variantForm.packaging} onChange={(e) => setVariantForm({ ...variantForm, packaging: e.target.value })} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm">
                  <option value="PET">PET</option>
                  <option value="CAN">Can</option>
                </select>
                <input required placeholder="Size (e.g. 300ml)" value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                <input required placeholder="SKU code" value={variantForm.skuCode} onChange={(e) => setVariantForm({ ...variantForm, skuCode: e.target.value })} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                <input required type="number" placeholder="MRP" value={variantForm.mrp} onChange={(e) => setVariantForm({ ...variantForm, mrp: e.target.value })} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                <input required type="number" placeholder="Dist. price" value={variantForm.distributorPrice} onChange={(e) => setVariantForm({ ...variantForm, distributorPrice: e.target.value })} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" />
                <button disabled={busy} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save'}
                </button>
                {variantError && <p className="col-span-full text-xs font-medium text-[var(--status-critical)]">{variantError}</p>}
              </form>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <th className="py-1.5 pr-3">Packaging</th>
                    <th className="py-1.5 pr-3">Size</th>
                    <th className="py-1.5 pr-3">SKU Code</th>
                    <th className="py-1.5 pr-3 text-right">MRP</th>
                    <th className="py-1.5 pr-3 text-right">Dist. Price</th>
                    <th className="py-1.5 pr-3">Status</th>
                    <th className="py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {(f.variants || []).map((v) => (
                    <tr key={v.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1.5 pr-3">{v.packaging}</td>
                      <td className="py-1.5 pr-3">{v.size}</td>
                      <td className="py-1.5 pr-3">
                        <code className="text-xs">{v.skuCode}</code>
                      </td>
                      <td className="tabular py-1.5 pr-3 text-right">Rs {v.mrp}</td>
                      <td className="tabular py-1.5 pr-3 text-right">Rs {v.distributorPrice}</td>
                      <td className="py-1.5 pr-3">
                        <span className={v.active ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}>{v.active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="py-1.5">
                        {v.active && (
                          <button onClick={() => deactivateVariant(v.id)} className="text-xs text-[var(--status-critical)] hover:underline">
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(f.variants || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-xs text-[var(--muted)]">
                        No variants yet — add the first packaging/size for this flavor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {families.length === 0 && <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-sm text-[var(--text-secondary)]">No product flavors yet.</div>}
      </div>
    </div>
  );
}

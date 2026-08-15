import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'GENERAL_STORE', label: 'General Store' },
  { value: 'PAN_SHOP', label: 'Pan Shop' },
  { value: 'KIRYANA_STORE', label: 'Kiryana Store' },
  { value: 'LARGE_STORE', label: 'Large Store' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'HORECA', label: 'HoReCa' },
  { value: 'MODERN_TRADE', label: 'Modern Trade' },
];

const CHILLER_TYPES: { value: string; label: string }[] = [
  { value: 'NONE', label: 'No chiller' },
  { value: 'COMPANY', label: 'Company chiller placed' },
  { value: 'COMPETITOR', label: 'Competitor chiller present' },
  { value: 'SHOP_OWNED', label: "Shop's own (unbranded) chiller" },
];

export default function AddRetailer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [category, setCategory] = useState('GENERAL_STORE');
  const [chillerType, setChillerType] = useState('NONE');
  const [competitorExclusive, setCompetitorExclusive] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!user?.territoryNodeId) {
      setError('Your account has no assigned territory.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('ownerName', ownerName);
      form.append('category', category);
      form.append('chillerType', chillerType);
      form.append('competitorExclusive', String(competitorExclusive));
      form.append('phone', phone);
      form.append('address', address);
      form.append('territoryNodeId', String(user.territoryNodeId));
      if (image) form.append('image', image);
      const { data } = await api.post('/retailers', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/universe/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add retailer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Add Retailer to Universe</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          New entries are added as <span className="font-medium">Untapped</span> in {user?.territoryNode?.name || 'your territory'}. On
          first visit they become <span className="font-medium">Productive</span> (if an order is booked) or{' '}
          <span className="font-medium">Non-Productive</span> (if not) — there's no in-between state.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Shop Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Owner Name</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Shop Type *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Chiller Status</label>
            <select value={chillerType} onChange={(e) => setChillerType(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {CHILLER_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={competitorExclusive} onChange={(e) => setCompetitorExclusive(e.target.checked)} className="h-4 w-4 accent-[var(--series-1)]" />
            Competitor-exclusive (e.g. Pepsi-only outlet)
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Shop Photo</label>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full text-sm" />
        </div>
        {error && <p className="text-xs font-medium text-[var(--status-critical)]">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {busy ? 'Saving…' : 'Add to Universe'}
        </button>
      </form>
    </div>
  );
}

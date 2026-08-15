import { Printer } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--page)]"
    >
      <Printer size={14} />
      {label}
    </button>
  );
}

export interface PrintParty {
  label: string; // e.g. "Distributor" or "Customer"
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
}

/**
 * Print-only letterhead: appears solely in the print stylesheet (see
 * .print-only in index.css). When `party` is supplied (a distributor or
 * retailer), the letterhead is addressed to that specific entity rather
 * than a generic company header — a distributor's stock statement is
 * headed with that distributor's name & address, a shop's invoice with
 * that shop's, etc.
 */
export function PrintHeader({ documentTitle, party, meta }: { documentTitle: string; party?: PrintParty | null; meta?: { label: string; value: string }[] }) {
  const { user } = useAuth();
  return (
    <div className="print-only mb-6 border-b-2 border-black pb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xl font-bold tracking-tight">SecondarySales Beverages Ltd.</div>
          <div className="text-xs text-gray-600">Sales &amp; Distribution Management System</div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div>Generated {new Date().toLocaleString()}</div>
          {user && <div>by {user.name} ({user.role.name})</div>}
        </div>
      </div>

      <div className="mt-4 text-lg font-bold uppercase tracking-wide">{documentTitle}</div>

      {party && (
        <div className="mt-2 rounded border border-gray-300 p-2 text-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{party.label}</div>
          <div className="font-semibold">{party.name}</div>
          {party.code && <div className="text-xs text-gray-600">Code: {party.code}</div>}
          {party.address && <div className="text-xs text-gray-600">{party.address}</div>}
          {party.phone && <div className="text-xs text-gray-600">{party.phone}</div>}
        </div>
      )}

      {meta && meta.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-700">
          {meta.map((m) => (
            <span key={m.label}>
              <span className="font-semibold">{m.label}:</span> {m.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

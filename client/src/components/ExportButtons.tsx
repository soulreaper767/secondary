import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { downloadReport } from '../lib/exportDownload';

export function ExportButtons({ path, params }: { path: string; params?: Record<string, any> }) {
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);

  async function handle(format: 'xlsx' | 'pdf') {
    setBusy(format);
    try {
      await downloadReport(path, params || {}, format);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print flex items-center gap-1.5">
      <button
        onClick={() => handle('xlsx')}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--page)] disabled:opacity-60"
      >
        <FileSpreadsheet size={14} className="text-[var(--status-good)]" />
        {busy === 'xlsx' ? 'Exporting…' : 'Excel'}
      </button>
      <button
        onClick={() => handle('pdf')}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--page)] disabled:opacity-60"
      >
        <FileText size={14} className="text-[var(--status-critical)]" />
        {busy === 'pdf' ? 'Exporting…' : 'PDF'}
      </button>
    </div>
  );
}

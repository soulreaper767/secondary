import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  emptyText = 'No data',
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string | number;
  emptyText?: string;
  /** One cell per column, rendered as a bold totals row pinned to the bottom — recompute from the currently filtered `rows` so it always matches what's on screen. */
  footer?: ReactNode[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--page)]">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--text-secondary)]">
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={keyFn(row)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--series-1)]/5">
              {columns.map((col, i) => (
                <td key={i} className={`tabular whitespace-nowrap px-3 py-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-[var(--text-primary)]/15 bg-[var(--page)] font-bold">
              {columns.map((col, i) => (
                <td key={i} className={`tabular whitespace-nowrap px-3 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {footer[i] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

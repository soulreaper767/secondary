import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number | '';
  onChange: (value: string | number | '') => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

/** A keyword-searchable single-select — type to filter, click to pick one item (e.g. one shop, one distributor). */
export function SearchableSelect({ options, value, onChange, placeholder = 'Search…', allLabel = 'All', className = '' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)) : options;

  return (
    <div ref={ref} className={`relative min-w-[180px] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-left text-sm"
      >
        <span className={`truncate ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--muted)]'}`}>{selected ? selected.label : allLabel}</span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && (
            <X
              size={13}
              className="text-[var(--muted)] hover:text-[var(--status-critical)]"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }}
            />
          )}
          <ChevronDown size={13} className="text-[var(--muted)]" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-2.5 py-2">
            <Search size={13} className="shrink-0 text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                setQuery('');
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--page)] ${!value ? 'font-semibold text-[var(--series-1)]' : ''}`}
            >
              {allLabel}
            </button>
            {filtered.length === 0 && <div className="px-3 py-4 text-center text-xs text-[var(--muted)]">No matches</div>}
            {filtered.slice(0, 100).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery('');
                }}
                className={`block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-[var(--page)] ${String(o.value) === String(value) ? 'font-semibold text-[var(--series-1)]' : ''}`}
                title={o.label}
              >
                {o.label}
                {o.sublabel && <span className="ml-1.5 text-xs text-[var(--muted)]">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { api } from '../api/client';
import { TerritoryNode, UniverseSummary } from '../types';

interface NodeSummary {
  universe: UniverseSummary;
  mtdSalesValue: number;
  nodeCount: number;
}

const LEVEL_LABEL: Record<string, string> = {
  NATIONAL: 'National',
  REGION: 'Region',
  SUB_REGION: 'Sub-Region',
  AREA: 'Area',
  TERRITORY: 'Territory',
};

function fmtCurrency(v: number) {
  return `Rs ${Math.round(v).toLocaleString()}`;
}

function TreeNode({ node, depth }: { node: TerritoryNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const [summary, setSummary] = useState<NodeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const hasChildren = (node.children?.length || 0) > 0;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !summary) {
      setLoading(true);
      try {
        const { data } = await api.get(`/territories/${node.id}/summary`);
        setSummary(data);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <div
        onClick={toggle}
        className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--page)]"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 text-[var(--muted)]">{hasChildren ? (open ? '▾' : '▸') : ''}</span>
          <span className="text-sm font-medium">{node.name}</span>
          <span className="rounded-full bg-[var(--page)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {LEVEL_LABEL[node.level]}
          </span>
        </div>
        {loading && <span className="text-[10px] text-[var(--muted)]">loading…</span>}
        {summary && (
          <div className="tabular flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span title="Total universe">🏪 {summary.universe.total}</span>
            <span title="Productive" className="text-[var(--status-good)]">
              ● {summary.universe.productive}
            </span>
            <span title="Non-productive" className="text-[var(--status-critical)]">
              ● {summary.universe.nonProductive}
            </span>
            <span className="font-medium text-[var(--text-primary)]">{fmtCurrency(summary.mtdSalesValue)}</span>
          </div>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TerritoryTree({ nodes }: { nodes: TerritoryNode[] }) {
  return (
    <div className="max-h-[520px] overflow-y-auto">
      {nodes.map((n) => (
        <TreeNode key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

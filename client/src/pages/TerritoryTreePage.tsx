import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TerritoryTree } from '../components/TerritoryTree';
import { TerritoryNode } from '../types';

export default function TerritoryTreePage() {
  const [tree, setTree] = useState<TerritoryNode[]>([]);

  useEffect(() => {
    api.get('/territories/tree').then((r) => setTree(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Territory Tree</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Every parent node rolls up the full universe and secondary sales of everything beneath it. Click a row to expand.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <TerritoryTree nodes={tree} />
      </div>
    </div>
  );
}

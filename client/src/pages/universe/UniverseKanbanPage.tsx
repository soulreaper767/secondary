import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { UniverseKanban } from '../../components/UniverseKanban';
import { Retailer, UniverseStatus } from '../../types';

export default function UniverseKanbanPage() {
  const [data, setData] = useState<Record<UniverseStatus, Retailer[]> | null>(null);

  useEffect(() => {
    api.get('/retailers/kanban').then((r) => setData(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Universe Kanban</h1>
        <p className="text-sm text-[var(--text-secondary)]">Outlets move left to right as they're visited and start ordering.</p>
      </div>
      {data ? <UniverseKanban data={data} /> : <div className="text-sm text-[var(--text-secondary)]">Loading…</div>}
    </div>
  );
}

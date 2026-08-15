import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Visit } from '../../types';

export default function TodayRoute() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const navigate = useNavigate();

  function load() {
    api.get('/route-plans/today').then((r) => setVisits(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function checkIn(id: number) {
    await api.post(`/route-plans/${id}/checkin`);
    load();
  }

  async function outcome(id: number, outcome: string, retailerId?: number) {
    await api.post(`/route-plans/${id}/outcome`, { outcome });
    load();
    if (outcome === 'ORDER_TAKEN' && retailerId) navigate(`/orders/new?retailerId=${retailerId}`);
  }

  async function skip(id: number) {
    await api.post(`/route-plans/${id}/skip`);
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Today's Route Plan</h1>
        <p className="text-sm text-[var(--text-secondary)]">Generated from your PJP for {new Date().toLocaleDateString()}.</p>
      </div>

      <div className="space-y-2">
        {visits.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center text-sm text-[var(--text-secondary)]">
            No outlets scheduled today. Check your PJP builder to plan visits for this weekday.
          </div>
        )}
        {visits.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{v.retailer?.name}</span>
                {v.retailer && <StatusBadge status={v.retailer.status} />}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {v.retailer?.category.replace('_', ' ')} · {v.retailer?.address || 'No address on file'}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-medium">{v.visitStatus}</span>
                {v.outcome && <span className="ml-2 text-[var(--text-secondary)]">Outcome: {v.outcome}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {v.visitStatus === 'PLANNED' && (
                <>
                  <button onClick={() => checkIn(v.id)} className="rounded-lg bg-[var(--series-1)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    Check In
                  </button>
                  <button onClick={() => skip(v.id)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--page)]">
                    Skip
                  </button>
                </>
              )}
              {v.visitStatus === 'VISITED' && !v.outcome && (
                <>
                  <button onClick={() => outcome(v.id, 'ORDER_TAKEN', v.retailerId)} className="rounded-lg bg-[var(--status-good)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    Order Taken
                  </button>
                  <button onClick={() => outcome(v.id, 'NO_ORDER')} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--page)]">
                    No Order
                  </button>
                  <button onClick={() => outcome(v.id, 'NOT_INTERESTED')} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--page)]">
                    Not Interested
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

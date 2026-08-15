import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@demo.local' },
  { label: 'Chief Sales Officer', email: 'cso@demo.local' },
  { label: 'National Sales Manager', email: 'nsm@demo.local' },
  { label: 'Regional Sales Manager', email: 'rsm1@demo.local' },
  { label: 'Zonal Sales Manager', email: 'zsm1@demo.local' },
  { label: 'Area Sales Manager', email: 'asm1@demo.local' },
  { label: 'Territory Sales Incharge', email: 'tsi1@demo.local' },
  { label: 'Order Booker', email: 'ob1@demo.local' },
  { label: 'Distributor Portal', email: 'distributor1@demo.local' },
];

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch {
      setError('Invalid email or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-lg md:grid-cols-2">
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 text-white md:flex"
          style={{ background: 'linear-gradient(150deg, #1d4ed8 0%, #2a78d6 40%, #4a3aa7 85%, #6d28d9 100%)' }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, #1baf7a55, transparent 70%)' }} />
          <div className="pointer-events-none absolute right-8 top-1/3 h-24 w-24 rounded-3xl border border-white/10" style={{ transform: 'rotate(20deg)' }} />

          <div className="relative">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold shadow-lg backdrop-blur">SS</div>
            <h1 className="mt-4 text-2xl font-bold leading-tight">SecondarySales</h1>
            <p className="mt-2 text-sm text-white/85">
              Territory, universe, PJP, distribution &amp; secondary sales management for the full sales hierarchy — CSO to Order Booker.
            </p>
          </div>
          <p className="relative text-xs text-white/60">Demo environment · seeded with a full org &amp; 45 days of sales history</p>
        </div>

        <div className="p-8">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Use a demo account below, or your own credentials.</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--series-1)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--series-1)]"
              />
            </div>
            {error && <p className="text-xs font-medium text-[var(--status-critical)]">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-[var(--series-1)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">Quick demo logins (password: Password123!)</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('Password123!');
                  }}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--page)]"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAdminSession } from './adminSessionContext.js';

// Placeholders matching the original admin prototype. The numbers and the queue
// come from review endpoints that have not been built yet (FR10, FR11).
const STATS = [
  { label: 'Pending review', dot: 'bg-amber-500' },
  { label: 'Verified', dot: 'bg-emerald-500' },
  { label: 'Flagged or rejected', dot: 'bg-red-500' },
];

export default function AdminDashboard() {
  const { user } = useAdminSession();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.username}</h1>
      <p className="mt-2 text-slate-600">Review and manage community resource listings.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <li key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />
              {s.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-300" aria-label="Not available yet">
              —
            </p>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="queue-heading"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 id="queue-heading" className="text-xl font-bold text-slate-900">
          Review queue
        </h2>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-700">The review queue hasn&apos;t been built yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Pending listings, the verification checklist and approve/reject actions will appear here.
          </p>
        </div>
      </section>

      <p className="mt-8 text-sm text-slate-500">
        <Link to="/" className="font-semibold text-blue-700 hover:underline">
          View the public site
        </Link>
      </p>
    </div>
  );
}

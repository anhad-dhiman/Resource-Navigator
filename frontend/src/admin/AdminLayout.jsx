import { Link, Outlet } from 'react-router-dom';
import { Compass, LogOut, ShieldCheck } from 'lucide-react';
import { useAdminSession } from './adminSessionContext.js';
import JsonPanel from '../components/JsonPanel.jsx';
import { SHOW_JSON } from '../lib/env.js';

const ROLE_LABEL = { administrator: 'Administrator', moderator: 'Moderator' };

/** Shell for signed-in admin pages: same look as the public site, with the account and sign out. */
export default function AdminLayout() {
  const { user, signOut } = useAdminSession();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-blue-700 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-blue-700 text-white">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm leading-tight font-semibold text-slate-900">
              Community Resource
              <span className="block text-blue-700">Staff portal</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="block font-semibold text-slate-900">{user.username}</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="admin-main" className="flex-1">
        <Outlet />
      </main>
      {SHOW_JSON && <JsonPanel />}
    </div>
  );
}

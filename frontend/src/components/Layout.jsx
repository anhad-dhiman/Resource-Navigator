import { Link, Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import JsonPanel from './JsonPanel.jsx';
import { SHOW_JSON } from '../lib/env.js';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-blue-700 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div
          className={`mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 ${SHOW_JSON ? 'pb-20' : ''} text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>Every listing is checked against the organization&apos;s official sources.</p>
          <p>
            In crisis or can&apos;t find what you need? Call{' '}
            <a href="tel:211" className="font-semibold text-blue-700 hover:underline">
              2-1-1
            </a>{' '}
            ·{' '}
            <Link to="/about#privacy" className="font-semibold text-blue-700 hover:underline">
              Privacy
            </Link>
          </p>
        </div>
      </footer>
      {SHOW_JSON && <JsonPanel />}
    </div>
  );
}

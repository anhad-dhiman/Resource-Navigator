import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../lib/useApi.js';
import JsonPanel from '../components/JsonPanel.jsx';
import { SHOW_JSON } from '../lib/env.js';

const inputClass =
  'mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none';

/** Staff sign-in. There is no sign-up: accounts are created with `npm run admin:create`. */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Already signed in? Skip the form.
  const session = useApi('admin-login-check', () => api.admin.me());

  if (session.status === 'done') return <Navigate to="/admin" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.admin.login({ username: username.trim(), password });
      navigate(location.state?.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(err);
      setPassword('');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-blue-950/30">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-white">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm leading-tight font-semibold text-slate-900">
              Community Resource
              <span className="block text-blue-700">Staff portal</span>
            </span>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">For administrators and moderators.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="admin-username" className="text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                maxLength={64}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  maxLength={200}
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="size-4" aria-hidden="true" />
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-blue-100">
          <Link to="/" className="font-semibold text-white underline underline-offset-2">
            Back to the public site
          </Link>
        </p>
      </main>
      {SHOW_JSON && <JsonPanel />}
    </div>
  );
}

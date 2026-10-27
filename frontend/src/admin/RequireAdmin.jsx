import { useCallback, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../lib/useApi.js';
import { ErrorMessage } from '../components/Status.jsx';
import { AdminSessionContext } from './adminSessionContext.js';

/**
 * Renders its children only for a signed-in admin. The session lives in an
 * httpOnly cookie the page can't read, so it asks the backend (GET /api/admin/me).
 */
export default function RequireAdmin({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [signedOut, setSignedOut] = useState(false);
  const session = useApi(`admin-me:${location.key}`, () => api.admin.me());

  const signOut = useCallback(async () => {
    try {
      await api.admin.logout();
    } finally {
      setSignedOut(true);
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const value = useMemo(
    () => (session.status === 'done' ? { user: session.data.user, signOut } : null),
    [session, signOut],
  );

  if (signedOut) return null;
  if (session.status === 'loading') {
    return (
      <p className="p-10 text-center text-slate-500" role="status">
        Checking your session…
      </p>
    );
  }
  if (session.status === 'error') {
    if (session.error.status === 401) {
      return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }
    return (
      <div className="p-10">
        <ErrorMessage error={session.error} />
      </div>
    );
  }
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

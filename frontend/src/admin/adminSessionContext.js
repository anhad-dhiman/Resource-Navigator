import { createContext, useContext } from 'react';

export const AdminSessionContext = createContext(null);

/** The signed-in admin ({user, signOut}). Only available inside RequireAdmin. */
export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used inside RequireAdmin');
  return ctx;
}

import { createContext, useContext } from 'react';

export const AppStateContext = createContext(null);

/** Selected city, city list, and the latest search. See AppStateProvider. */
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

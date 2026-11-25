import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { AppStateContext } from './appStateContext.js';

/**
 * Holds the selected city, the city list, and the latest search.
 * Search state lives only in memory: it is never put in the URL or browser
 * storage, so query text is not saved anywhere (FR12). It survives moving
 * between pages, so "Back" from a detail page still shows the results.
 */
export function AppStateProvider({ children }) {
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState('');
  const [search, setSearch] = useState({
    status: 'idle',
    query: '',
    response: null,
    error: null,
    summary: null,
  });
  const requestId = useRef(0);

  useEffect(() => {
    api
      .listCities()
      .then((data) => setCities(data.cities))
      .catch(() => setCities([]));
  }, []);

  /**
   * Runs a search, then (if offered) fetches the AI summary. Cards show as soon as the
   * search returns; `summary` fills in afterwards: null | {status:'loading'|'done'|'error', text}.
   */
  const runSearch = useCallback(
    async (query) => {
      const id = ++requestId.current;
      const current = () => id === requestId.current; // ignore replies for replaced searches
      setSearch({ status: 'loading', query, response: null, error: null, summary: null });
      let response;
      try {
        response = await api.search({ query, city });
      } catch (error) {
        if (current()) setSearch({ status: 'error', query, response: null, error, summary: null });
        return;
      }
      if (!current()) return;
      const wantsSummary = response.status === 'ok' && response.summary_available;
      setSearch({
        status: 'done',
        query,
        response,
        error: null,
        summary: wantsSummary ? { status: 'loading', text: null } : null,
      });
      if (!wantsSummary) return;

      let summary;
      try {
        const data = await api.summary({ query, resourceIds: response.results.map((r) => r.resource_id) });
        summary = data.summary ? { status: 'done', text: data.summary } : null;
      } catch {
        summary = null; // the cards are what matter; a missing summary is not an error to show
      }
      if (current()) setSearch((s) => ({ ...s, summary }));
    },
    [city],
  );

  const value = useMemo(
    // Changing the city only sets the filter; the next search uses it.
    () => ({ cities, city, setCity, search, runSearch }),
    [cities, city, search, runSearch],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

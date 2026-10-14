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
  const [search, setSearch] = useState({ status: 'idle', query: '', response: null, error: null });
  const requestId = useRef(0);

  useEffect(() => {
    api
      .listCities()
      .then((data) => setCities(data.cities))
      .catch(() => setCities([]));
  }, []);

  const execute = useCallback(async (query, searchCity) => {
    const id = ++requestId.current;
    setSearch({ status: 'loading', query, response: null, error: null });
    try {
      const response = await api.search({ query, city: searchCity });
      // Ignore responses for searches that have since been replaced.
      if (id === requestId.current) setSearch({ status: 'done', query, response, error: null });
    } catch (error) {
      if (id === requestId.current) setSearch({ status: 'error', query, response: null, error });
    }
  }, []);

  const runSearch = useCallback((query) => execute(query, city), [execute, city]);

  // Changing the city re-runs the current search, if there is one.
  const changeCity = useCallback(
    (next) => {
      setCity(next);
      if (search.status !== 'idle' && search.query) execute(search.query, next);
    },
    [execute, search.status, search.query],
  );

  const value = useMemo(
    () => ({ cities, city, setCity: changeCity, search, runSearch }),
    [cities, city, changeCity, search, runSearch],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

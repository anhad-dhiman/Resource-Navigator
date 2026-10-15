import { useEffect, useState } from 'react';

/**
 * Loads data from the API whenever `key` changes.
 * The result is tagged with the key it was fetched for, so a stale response
 * never shows under new filters, and "loading" is derived rather than set.
 * @param {string} key Changes whenever the request should be re-run.
 * @param {() => Promise<any>} fetcher Called for each new key.
 * @returns {{status: 'loading'} | {status: 'done', data: any} | {status: 'error', error: Error}}
 */
export function useApi(key, fetcher) {
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => active && setResult({ key, data, error: null }))
      .catch((error) => active && setResult({ key, data: null, error }));
    return () => {
      active = false;
    };
    // The key captures everything the fetcher depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (result.key !== key) return { status: 'loading' };
  return result.error ? { status: 'error', error: result.error } : { status: 'done', data: result.data };
}

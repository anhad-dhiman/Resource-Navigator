import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api } from '../api/client.js';
import { useAppState } from '../context/appStateContext.js';
import CitySelect from '../components/CitySelect.jsx';
import ResourceGrid from '../components/ResourceGrid.jsx';
import SortSelect from '../components/SortSelect.jsx';
import { sortResources } from '../lib/sort.js';
import { CardSkeletons, ErrorMessage } from '../components/Status.jsx';
import { categoryStyle } from '../lib/categories.js';

const SORT_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'reviewed', label: 'Recently reviewed' },
];

/** Browse every verified resource, filtered by city and category (GET /api/resources). */
export default function Resources() {
  const { cities, city, setCity } = useAppState();
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [sort, setSort] = useState('category');

  useEffect(() => {
    api
      .listServiceTypes()
      .then((d) => setTypes(d.service_types))
      .catch(() => setTypes([]));
  }, []);

  const state = useApi(`${city}|${type}`, () => api.listResources({ city, type }));

  const where = city ? `in ${city}, BC` : 'across Metro Vancouver';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Browse resources</h1>
      <p className="mt-2 text-slate-600">
        Every verified service in our directory. Filter by city or category.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <CitySelect
          id="browse-city"
          cities={cities}
          value={city}
          onChange={setCity}
          className="border-slate-200 bg-white text-slate-700"
        />
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Category</legend>
          {['', ...types].map((t) => {
            const selected = type === t;
            return (
              <button
                key={t || 'all'}
                type="button"
                aria-pressed={selected}
                onClick={() => setType(t)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selected
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {t && <span className={`size-2 rounded-full ${categoryStyle(t).dot}`} aria-hidden="true" />}
                {t || 'All'}
              </button>
            );
          })}
        </fieldset>
      </div>

      <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500" aria-live="polite">
          {state.status === 'done' &&
            `Showing ${state.data.count} ${state.data.count === 1 ? 'resource' : 'resources'} ${where}`}
        </p>
        <SortSelect id="browse-sort" options={SORT_OPTIONS} value={sort} onChange={setSort} />
      </div>

      {state.status === 'loading' && <CardSkeletons count={6} />}
      {state.status === 'error' && <ErrorMessage error={state.error} />}
      {state.status === 'done' &&
        (state.data.count ? (
          <ResourceGrid resources={sortResources(state.data.resources, sort)} />
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            No verified resources match these filters yet.
          </p>
        ))}
    </div>
  );
}

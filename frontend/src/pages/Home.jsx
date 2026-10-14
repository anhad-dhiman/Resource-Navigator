import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAppState } from '../context/appStateContext.js';
import SearchBar from '../components/SearchBar.jsx';
import ResourceGrid from '../components/ResourceGrid.jsx';
import SortSelect from '../components/SortSelect.jsx';
import { sortResources } from '../lib/sort.js';
import { CardSkeletons, ErrorMessage, NoResults } from '../components/Status.jsx';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'reviewed', label: 'Recently reviewed' },
];

function Results() {
  const { search } = useAppState();
  const [sort, setSort] = useState('relevance');
  const sectionRef = useRef(null);
  const { status, response, error } = search;

  // Bring new results into view once a search finishes.
  useEffect(() => {
    if (status === 'done' || status === 'error') {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status, response]);

  if (status === 'idle') return null;

  const where = response?.city ? `in ${response.city}, BC` : 'across Metro Vancouver';

  return (
    <section
      ref={sectionRef}
      aria-labelledby="results-heading"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="results-heading" className="text-2xl font-bold text-slate-900">
            Verified Community Resources
          </h2>
          <p className="mt-1 text-sm text-slate-500" aria-live="polite">
            {status === 'loading' && 'Searching verified services…'}
            {status === 'done' &&
              response.status === 'ok' &&
              `Showing ${response.count} ${response.count === 1 ? 'resource' : 'resources'} ${where}`}
            {status === 'done' && response.status === 'no_results' && `No verified resources found ${where}`}
          </p>
        </div>
        {status === 'done' && response.status === 'ok' && response.count > 1 && (
          <SortSelect id="results-sort" options={SORT_OPTIONS} value={sort} onChange={setSort} />
        )}
      </div>

      {status === 'loading' && <CardSkeletons />}
      {status === 'error' && <ErrorMessage error={error} />}
      {status === 'done' && response.status === 'no_results' && <NoResults message={response.message} />}
      {status === 'done' && response.status === 'ok' && (
        <ResourceGrid resources={sortResources(response.results, sort)} />
      )}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.15),transparent_40%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 text-center sm:pt-20 sm:pb-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Serving Metro Vancouver
          </p>
          <h1 className="mx-auto mt-5 max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            How can we help you today?
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-blue-100 sm:text-lg">
            Describe what you&apos;re looking for in your own words. We&apos;ll find verified community
            services near you.
          </p>
          <div className="mt-8">
            <SearchBar />
          </div>
          <p className="mx-auto mt-6 flex max-w-lg items-start justify-center gap-2 text-sm text-blue-100">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <span>
              No account or personal details needed. We don&apos;t save what you type.{' '}
              <Link to="/about#privacy" className="font-semibold text-white underline underline-offset-2">
                Read our privacy policy
              </Link>
            </span>
          </p>
        </div>
      </section>
      <Results />
    </>
  );
}

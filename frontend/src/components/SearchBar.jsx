import { useState } from 'react';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { useAppState } from '../context/appStateContext.js';
import { QUICK_SEARCHES } from '../lib/categories.js';
import CitySelect from './CitySelect.jsx';

const MAX_LENGTH = 500;

export default function SearchBar() {
  const { cities, city, setCity, search, runSearch } = useAppState();
  const [text, setText] = useState(search.query);
  const loading = search.status === 'loading';

  function submit(query) {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setText(trimmed);
    runSearch(trimmed);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 shadow-blue-950/20 ring-black/5"
      >
        <label htmlFor="search-query" className="sr-only">
          Describe what you need
        </label>
        <Search className="ml-2 size-5 shrink-0 text-blue-600" aria-hidden="true" />
        <input
          id="search-query"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          placeholder='Describe what you need, e.g. "I need emergency shelter and a hot meal"'
          className="min-h-11 w-full min-w-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
          {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <CitySelect
          id="search-city"
          cities={cities}
          value={city}
          onChange={setCity}
          icon={MapPin}
          label="Search in city"
          className="border-white/25 bg-white/10 text-white [&>option]:text-slate-900"
        />
        {QUICK_SEARCHES.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => submit(chip.query)}
            disabled={loading}
            className="min-h-11 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

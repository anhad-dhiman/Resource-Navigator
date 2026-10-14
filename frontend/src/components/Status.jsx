import { AlertTriangle, PhoneCall } from 'lucide-react';

/** Shown when the backend returns status "no_results": the fixed 211 BC referral. */
export function NoResults({ message }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <PhoneCall className="mx-auto size-8 text-amber-600" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-semibold text-slate-900">No verified match found</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a
          href="tel:211"
          className="inline-flex min-h-11 items-center rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Call 2-1-1
        </a>
        <a
          href="https://bc.211.ca"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Visit bc.211.ca<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

export function ErrorMessage({ error }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-xl gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
    >
      <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      <p>{error?.message ?? 'Something went wrong. Please try again later.'}</p>
    </div>
  );
}

export function CardSkeletons({ count = 3 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-5 space-y-2">
            <div className="h-3 rounded bg-slate-100" />
            <div className="h-3 rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

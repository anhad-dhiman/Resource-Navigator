import { Sparkles } from 'lucide-react';

/**
 * One AI-written summary of why these results were shown, above the cards.
 * @param {{summary: {status: 'loading'|'done', text: string|null}|null}} props
 */
export default function SummaryPanel({ summary }) {
  if (!summary) return null;

  if (summary.status === 'loading') {
    return (
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5" aria-busy="true">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
          <Sparkles className="size-4 animate-pulse" aria-hidden="true" />
          Writing a short summary of these results…
        </p>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-blue-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-blue-100" />
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="summary-heading"
      className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"
    >
      <h3 id="summary-heading" className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Sparkles className="size-4" aria-hidden="true" />
        Why we’re showing these services
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
          AI summary
        </span>
      </h3>
      <p className="mt-2 leading-relaxed text-slate-800">{summary.text}</p>
      <p className="mt-2 text-xs text-slate-500">
        Addresses, phone numbers and hours on each card come from our verified records, not from the AI.
      </p>
    </section>
  );
}

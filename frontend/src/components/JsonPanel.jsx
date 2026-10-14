import { useEffect, useState } from 'react';
import { Braces, X } from 'lucide-react';
import { onExchange } from '../api/client.js';

function Block({ title, value }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</h3>
      <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-emerald-300">
        {value === null ? '(none)' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Developer panel showing the last JSON request and response, like Postman.
 * Enabled in `npm run dev` or with VITE_SHOW_JSON=true. Held in memory only.
 */
export default function JsonPanel() {
  const [open, setOpen] = useState(false);
  const [exchange, setExchange] = useState(null);

  useEffect(() => onExchange(setExchange), []);

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <section
          aria-label="API request and response"
          className="w-[min(36rem,calc(100vw-2rem))] space-y-3 rounded-2xl bg-slate-900 p-4 text-slate-100 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Last API call</h2>
              {exchange ? (
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {exchange.method} {exchange.path} →{' '}
                  <span
                    className={
                      exchange.status >= 200 && exchange.status < 300 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {exchange.status || 'network error'}
                  </span>{' '}
                  · {Math.round(exchange.ms)} ms
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400">No requests yet.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-lg hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-400"
              aria-label="Close JSON panel"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {exchange && (
            <>
              <Block title="Request body" value={exchange.request} />
              <Block title="Response body" value={exchange.response} />
            </>
          )}
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <Braces className="size-4" aria-hidden="true" />
        JSON
      </button>
    </div>
  );
}

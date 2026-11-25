import { useEffect, useState } from 'react';
import { Check, ListChecks, MessageSquareText, Search, Lightbulb } from 'lucide-react';

const STEPS = [
  { icon: MessageSquareText, label: 'Understanding your request' },
  { icon: Search, label: 'Searching verified services' },
  { icon: ListChecks, label: 'Preparing your results' },
];

const TIPS = [
  'Every listing is checked against the organization’s official website or 211 BC.',
  'Each card shows when its listing was last reviewed.',
  'Use the city filter to see services in one city only.',
  'No account needed. We don’t save what you type.',
  'In an emergency, call 9-1-1. For free help finding services, call or text 2-1-1.',
];

// The search request does steps 1 and 2 on the server; the page can't see which
// one it is on, so the steps advance on a timer that matches typical timings.
const STEP_AT_MS = [0, 2500, 5500];
const TIP_EVERY_MS = 4500;

/** Shown while a search runs: three steps and a rotating tip, so the wait feels shorter. */
export default function SearchProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(timer);
  }, []);

  const step = STEP_AT_MS.filter((t) => elapsed >= t).length - 1;
  const tip = TIPS.at(Math.floor(elapsed / TIP_EVERY_MS) % TIPS.length);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-lg font-semibold text-slate-900">Finding verified services for you</p>
      <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds.</p>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="progress-bar h-full w-1/3 rounded-full bg-blue-600" />
      </div>

      <ol className="mt-6 space-y-4">
        {STEPS.map(({ icon: Icon, label }, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'waiting';
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${
                  state === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : state === 'active'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {state === 'done' ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Icon
                    className={`size-4 ${state === 'active' ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={`text-sm ${state === 'waiting' ? 'text-slate-400' : 'font-medium text-slate-800'}`}
              >
                {label}
                <span className="sr-only">
                  {state === 'done' ? ' (done)' : state === 'active' ? ' (in progress)' : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {STEPS.at(step).label}
      </p>

      <div className="mt-6 flex gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p key={tip} className="fade-in">
          <span className="font-semibold">Did you know? </span>
          {tip}
        </p>
      </div>
    </div>
  );
}

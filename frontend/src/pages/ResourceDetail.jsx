import { useApi } from '../lib/useApi.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  Globe,
  Languages,
  ListChecks,
  MapPin,
  Navigation,
  Phone,
} from 'lucide-react';
import { api } from '../api/client.js';
import { CategoryBadge, VerificationBadge } from '../components/Badges.jsx';
import { ErrorMessage } from '../components/Status.jsx';
import { directionsUrl, displayHost, formatDate, safeUrl, telHref } from '../lib/format.js';

function Field({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className="mt-0.5 text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

/** Full record for one resource (FR5), from GET /api/resources/:id. */
export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useApi(id, () => api.getResource(id));

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to results
    </button>
  );

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        {back}
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {back}
        <div className="mt-6">
          <ErrorMessage error={state.error} />
        </div>
      </div>
    );
  }

  const r = state.data.resource;
  const url = safeUrl(r.official_url);
  const tel = telHref(r.contact_phone);
  const directions = directionsUrl(r);
  const reviewed = formatDate(r.verification?.last_reviewed_at);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {back}
      <article className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <CategoryBadge serviceType={r.service_type} />
            <VerificationBadge status={r.verification?.status} />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{r.service_name}</h1>
          {r.description && <p className="mt-3 leading-relaxed text-slate-600">{r.description}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {tel && (
              <a
                href={tel}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call {r.contact_phone}
              </a>
            )}
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                <Navigation className="size-4" aria-hidden="true" />
                Directions<span className="sr-only"> (opens Google Maps)</span>
              </a>
            )}
          </div>
        </div>

        <dl className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <Field icon={MapPin} label="Address">
            {r.physical_address && `${r.physical_address}, ${r.city}, BC`}
          </Field>
          <Field icon={Phone} label="Phone">
            {r.contact_phone}
          </Field>
          <Field icon={Clock} label="Hours">
            {r.operating_hours}
          </Field>
          <Field icon={Globe} label="Website">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                {displayHost(url)}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </Field>
          <Field icon={ListChecks} label="Who can use it">
            {r.eligibility_criteria}
          </Field>
          <Field icon={Languages} label="Languages">
            {r.language_support}
          </Field>
        </dl>

        <footer className="flex flex-wrap items-center gap-3 bg-emerald-50/60 px-6 py-4 text-sm text-slate-600 sm:px-8">
          <CalendarCheck className="size-5 text-emerald-600" aria-hidden="true" />
          <span>
            {r.verification?.status === 'Verified' ? 'Verified' : r.verification?.status}
            {reviewed && <> · last reviewed {reviewed}</>} · Record #{r.resource_id}
          </span>
          <Link to="/about#verification" className="ml-auto font-semibold text-emerald-700 hover:underline">
            How we verify
          </Link>
        </footer>
      </article>
    </div>
  );
}

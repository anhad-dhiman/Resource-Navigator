import { Link } from 'react-router-dom';
import { Clock, Globe, MapPin, Navigation, Phone, Sparkles } from 'lucide-react';
import { CategoryBadge, VerificationBadge } from './Badges.jsx';
import { directionsUrl, displayHost, formatDate, safeUrl, telHref } from '../lib/format.js';

function Row({ icon: Icon, children }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * One resource. Every fact shown comes from the database record. The optional
 * match_explanation is reserved for the AI step and is labelled as such.
 */
export default function ResourceCard({ resource }) {
  const {
    resource_id,
    service_name,
    service_type,
    description,
    physical_address,
    city,
    contact_phone,
    official_url,
    operating_hours,
    verification,
    match_explanation,
  } = resource;
  const url = safeUrl(official_url);
  const tel = telHref(contact_phone);
  const directions = directionsUrl(resource);
  const reviewed = formatDate(verification?.last_reviewed_at);
  const headingId = `resource-${resource_id}-name`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 id={headingId} className="text-lg leading-snug font-semibold text-slate-900">
        {service_name}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <CategoryBadge serviceType={service_type} />
        <VerificationBadge status={verification?.status} />
      </div>

      {description && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{description}</p>
      )}

      {match_explanation && (
        <p className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Why this matches: </span>
            {match_explanation}
          </span>
        </p>
      )}

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {physical_address && (
          <Row icon={MapPin}>
            {physical_address}, {city}
          </Row>
        )}
        {contact_phone && (
          <Row icon={Phone}>
            {tel ? (
              <a href={tel} className="hover:text-blue-700 hover:underline">
                {contact_phone}
              </a>
            ) : (
              contact_phone
            )}
          </Row>
        )}
        {operating_hours && (
          <Row icon={Clock}>
            <span className="line-clamp-2">{operating_hours}</span>
          </Row>
        )}
        {url && (
          <Row icon={Globe}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
              {displayHost(url)}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Row>
        )}
      </ul>

      <div className="mt-auto pt-4">
        {reviewed && <p className="mb-3 text-right text-xs text-slate-500">Reviewed {reviewed}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/resources/${resource_id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            View details<span className="sr-only"> for {service_name}</span>
          </Link>
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Directions<span className="sr-only"> to {service_name} (opens Google Maps)</span>
            </a>
          ) : (
            <span />
          )}
        </div>
      </div>
    </article>
  );
}

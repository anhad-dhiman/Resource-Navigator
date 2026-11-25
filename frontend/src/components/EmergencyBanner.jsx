import { Phone, Siren } from 'lucide-react';

const button =
  'inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2';

/**
 * Shown above results when the AI flags an emergency or self-harm.
 * @param {{urgency: 'emergency'|'self_harm'|null}} props
 */
export default function EmergencyBanner({ urgency }) {
  if (!urgency) return null;
  const selfHarm = urgency === 'self_harm';

  return (
    <div role="alert" className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5 sm:p-6">
      <div className="flex gap-3">
        <Siren className="mt-0.5 size-6 shrink-0 text-red-600" aria-hidden="true" />
        <div>
          <p className="text-lg font-bold text-red-900">
            {selfHarm
              ? 'If you are thinking about suicide or hurting yourself, you are not alone.'
              : 'If someone is hurt or in danger, call 9-1-1 now.'}
          </p>
          <p className="mt-1 text-sm text-red-900">
            {selfHarm
              ? 'Call or text 9-8-8 any time for free, confidential support. If you are in immediate danger, call 9-1-1.'
              : 'This website lists community services and cannot send help. Do not wait for a search result in an emergency.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selfHarm && (
              <>
                <a
                  href="tel:988"
                  className={`${button} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`}
                >
                  <Phone className="size-4" aria-hidden="true" />
                  Call 9-8-8
                </a>
                <a
                  href="sms:988"
                  className={`${button} bg-white text-red-800 ring-1 ring-red-300 hover:bg-red-100 focus-visible:outline-red-600`}
                >
                  Text 9-8-8
                </a>
              </>
            )}
            <a
              href="tel:911"
              className={`${button} ${
                selfHarm
                  ? 'bg-white text-red-800 ring-1 ring-red-300 hover:bg-red-100'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } focus-visible:outline-red-600`}
            >
              <Phone className="size-4" aria-hidden="true" />
              Call 9-1-1
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

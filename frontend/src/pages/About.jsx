import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function Section({ id, title, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <h2 id={`${id}-title`} className="text-xl font-bold text-slate-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function About() {
  const { hash } = useLocation();

  // Scroll to #privacy or #verification when linked directly.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">About the Navigator</h1>
        <p className="mt-2 text-slate-600">
          A free tool that helps Metro Vancouver residents find food, housing, legal aid, health care and
          senior support, without needing to know the official name of a service.
        </p>
      </div>

      <Section id="how" title="How it works">
        <p>
          You describe what you need in your own words. An AI model works out which kinds of services you
          need, and we search our directory for services that have been checked and verified. Every phone
          number, address and opening hour comes from our verified records, never from the AI. The AI only
          writes the short &quot;Why this may help&quot; summary on each card, using that service&apos;s own
          listing.
        </p>
        <p>
          If nothing matches, we&apos;ll point you to <strong>211 British Columbia</strong> (call or text
          2-1-1), a free, confidential service that can help you find support.
        </p>
      </Section>

      <Section id="verification" title="How we verify services">
        <p>
          Each listing is reviewed against the organization&apos;s official website and trusted directories
          such as 211 BC. We record the evidence used and the date of the review, and listings are reviewed
          again every month. Listings that are pending review or have been flagged are never shown.
        </p>
      </Section>

      <Section id="privacy" title="Privacy policy">
        <ul className="list-disc space-y-2 pl-5">
          <li>You don&apos;t need an account, and we never ask for your name, email or phone number.</li>
          <li>
            What you type is used only to find matching services. We don&apos;t save it in our database, write
            it to our server logs or use it for analytics, and it is never added to the page address.
          </li>
          <li>
            To understand your request and explain the matches, what you type is sent to an AI service: Google
            Gemini, or Groq if Gemini is unavailable. We use Gemini&apos;s free tier, and on Gemini&apos;s
            free tier, Google may use what you send to improve its products. Don&apos;t include your name,
            contact details or other information that identifies you.
          </li>
          <li>Your search is cleared when you close or refresh the page.</li>
          <li>
            The Directions button opens Google Maps with the service&apos;s address only, not your search.
          </li>
        </ul>
      </Section>
    </div>
  );
}

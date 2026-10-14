import { BadgeCheck } from 'lucide-react';
import { categoryStyle } from '../lib/categories.js';

export function CategoryBadge({ serviceType }) {
  const { badge, dot } = categoryStyle(serviceType);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {serviceType}
    </span>
  );
}

export function VerificationBadge({ status }) {
  if (status !== 'Verified') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Verified
    </span>
  );
}

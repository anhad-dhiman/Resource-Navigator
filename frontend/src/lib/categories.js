import { Apple, HeartPulse, House, Scale, UsersRound, LifeBuoy } from 'lucide-react';

/** Display settings per service_type value in the database. */
const CATEGORIES = {
  Housing: { icon: House, badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' },
  Food: { icon: Apple, badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  'Legal Aid': { icon: Scale, badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' },
  Health: { icon: HeartPulse, badge: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500' },
  'Senior Support': { icon: UsersRound, badge: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' },
};

const FALLBACK = { icon: LifeBuoy, badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

export function categoryStyle(serviceType) {
  return CATEGORIES[serviceType] ?? FALLBACK;
}

/** Quick-search chips on the home page: label shown, and the text sent as the query. */
export const QUICK_SEARCHES = [
  { label: 'Housing', query: 'housing and shelter' },
  { label: 'Food', query: 'food bank and meals' },
  { label: 'Legal Aid', query: 'free legal advice' },
  { label: 'Health', query: 'health clinic' },
  { label: 'Senior Support', query: 'senior support' },
];

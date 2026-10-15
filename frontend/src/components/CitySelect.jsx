import { ChevronDown } from 'lucide-react';

/**
 * City dropdown. An empty value means all of Metro Vancouver.
 * Options come from GET /api/cities, so only cities with verified resources appear.
 */
export default function CitySelect({
  id,
  cities,
  value,
  onChange,
  icon: Icon,
  className = '',
  label = 'City',
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-500"
          aria-hidden="true"
        />
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 cursor-pointer appearance-none rounded-lg border py-2 pr-9 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
          Icon ? 'pl-9' : 'pl-3'
        } ${className}`}
      >
        <option value="">Metro Vancouver</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}, BC
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-70"
        aria-hidden="true"
      />
    </div>
  );
}

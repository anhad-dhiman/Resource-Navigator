import { ChevronDown } from 'lucide-react';

/**
 * @param {{options: {value: string, label: string}[], value: string, onChange: (v: string) => void}} props
 */
export default function SortSelect({ id, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-slate-500">
        Sort by
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-3 font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

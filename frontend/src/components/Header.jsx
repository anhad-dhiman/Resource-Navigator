import { Link, NavLink } from 'react-router-dom';
import { MapPin, Compass } from 'lucide-react';
import { useAppState } from '../context/appStateContext.js';
import CitySelect from './CitySelect.jsx';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/resources', label: 'Resources' },
  { to: '/about', label: 'About' },
];

export default function Header() {
  const { cities, city, setCity } = useAppState();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-700 text-white">
            <Compass className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm leading-tight font-semibold text-slate-900">
            Community Resource
            <span className="block text-blue-700">Navigator</span>
          </span>
        </Link>

        <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <ul className="flex justify-center gap-1 sm:gap-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden sm:block">
          <CitySelect
            id="header-city"
            cities={cities}
            value={city}
            onChange={setCity}
            icon={MapPin}
            className="border-slate-200 bg-white text-slate-700"
          />
        </div>
      </div>
    </header>
  );
}

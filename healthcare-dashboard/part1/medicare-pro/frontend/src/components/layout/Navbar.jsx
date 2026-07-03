import { NavLink } from 'react-router-dom';
import { FileScan, LayoutList } from 'lucide-react';
import { DarkModeToggle } from '../common/DarkModeToggle';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/', label: 'Upload', icon: FileScan },
  { to: '/prescriptions', label: 'Records', icon: LayoutList },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border dark:border-border-dark bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rx-cross h-7 w-7 rounded-md bg-clinical-500 text-white" aria-hidden="true" />
          <div className="leading-tight">
            <p className="font-display font-semibold text-[1.05rem] text-ink dark:text-white tracking-tight">
              Medicare Pro
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint dark:text-ink-faint/80 -mt-0.5">
              Prescription Analyzer
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-clinical-50 text-clinical-700 dark:bg-clinical-900/50 dark:text-clinical-200'
                    : 'text-ink-light hover:text-ink dark:text-ink-faint dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                )
              }
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <div className="ml-1.5 pl-1.5 sm:ml-2.5 sm:pl-2.5 border-l border-border dark:border-border-dark">
            <DarkModeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}

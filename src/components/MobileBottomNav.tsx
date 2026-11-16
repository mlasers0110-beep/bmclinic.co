import { Link, useLocation } from 'react-router-dom';
import { Home, Scan, Camera, SlidersHorizontal, History } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Start', Icon: Home, matchPrefix: false },
  { to: '/analiza', label: 'Analiza', Icon: Scan, matchPrefix: true },
  { to: '/skaner', label: 'Skaner 3D', Icon: Camera, matchPrefix: true },
  { to: '/parametry', label: 'Parametry', Icon: SlidersHorizontal, matchPrefix: true },
  { to: '/historia', label: 'Historia', Icon: History, matchPrefix: true },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Nawigacja mobilna"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-skin-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-center h-[52px]">
        {NAV_ITEMS.map(({ to, label, Icon, matchPrefix }) => {
          const isActive = matchPrefix
            ? location.pathname.startsWith(to)
            : location.pathname === to;

          return (
            <Link
              key={to}
              to={to}
              className={`min-h-[48px] flex flex-col items-center justify-center transition-colors touch-manipulation ${
                isActive ? 'text-navy-900' : 'text-navy-400 hover:text-navy-700'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.25 : 1.75}
                className={isActive ? 'text-gold-600' : undefined}
              />
              <span
                className={`text-[10px] font-sans tracking-tight mt-0.5 whitespace-nowrap ${
                  isActive ? 'font-semibold text-navy-900' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'Start' },
  { to: '/analiza', label: 'Kwestionariusz' },
  { to: '/parametry', label: 'Parametry' },
  { to: '/skaner', label: 'Skaner 3D' },
  { to: '/historia', label: 'Historia' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerBg =
    isLanding && !scrolled
      ? 'bg-transparent'
      : 'bg-white/95 backdrop-blur-md border-b border-skin-100';

  const textColor = isLanding && !scrolled ? 'text-white' : 'text-navy-900';

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 ${headerBg}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 md:h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/"
          className={`font-serif text-lg md:text-xl font-medium tracking-wide whitespace-nowrap shrink-0 transition-colors duration-200 ${textColor}`}
        >
          MySkin
          <span
            className={`${
              isLanding && !scrolled ? 'text-gold-300' : 'text-gold-500'
            } transition-colors duration-200`}
          >
            Code
          </span>
        </Link>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-sans whitespace-nowrap shrink-0 transition-opacity duration-150 hover:opacity-75 ${textColor} ${
                  isActive ? 'underline underline-offset-8 decoration-gold-500 font-medium' : ''
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <Link
            to="/skaner"
            className={`text-xs md:text-sm font-sans font-medium px-3.5 md:px-5 py-1.5 md:py-2 rounded-full border whitespace-nowrap shrink-0 transition-colors duration-200 ${
              isLanding && !scrolled
                ? 'border-white/70 text-white hover:bg-white hover:text-navy-900'
                : 'border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white'
            }`}
          >
            Aparat i LiDAR
          </Link>
        </div>
      </div>
    </header>
  );
}

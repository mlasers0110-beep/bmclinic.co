import { Link } from 'react-router-dom';
import { PWAInstallButton } from './PWAInstallButton';

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-navy-300 pt-12 pb-24 md:pb-12 mt-auto">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="font-serif text-lg font-medium text-white mb-3">
              MySkin<span className="text-gold-400">Code</span>
            </div>
            <p className="text-sm leading-relaxed text-navy-400 mb-4">
              Zaawansowana analiza parametrów skóry oparta na systemie kodowania MSC-MATRIX.
              9 klinicznych klas skóry oraz wieloparametrowa diagnostyka mobilna i gabinetowa.
            </p>
            <PWAInstallButton variant="light" />
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Nawigacja</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Strona główna
                </Link>
              </li>
              <li>
                <Link to="/analiza" className="hover:text-white transition-colors">
                  Kwestionariusz MSC-MATRIX
                </Link>
              </li>
              <li>
                <Link to="/parametry" className="hover:text-white transition-colors">
                  Badane parametry skóry
                </Link>
              </li>
              <li>
                <Link to="/skaner" className="hover:text-white transition-colors">
                  Pulpit aparatu i skaner 3D LiDAR
                </Link>
              </li>
              <li>
                <Link to="/historia" className="hover:text-white transition-colors">
                  Historia analiz
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Architektura kliniczna</h4>
            <ul className="space-y-2 text-sm text-navy-400">
              <li>9 fenotypów skóry (SEB, XER, VAS, AGE, OIL, MIX, NOR, CIC, REM)</li>
              <li>Pulpit aparatu: kalibracja WB, czujnik światła i ostrości</li>
              <li>Rekonstrukcja 3D z jednoczesnego zapisu wideo i LiDAR ToF</li>
              <li>8 konfigurowalnych parametrów biofizycznych + PWA mobilne</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-navy-500">
          <p>&copy; {new Date().getFullYear()} MySkinCode. Wszelkie prawa zastrzeżone.</p>
          <p className="text-center md:text-right">
            Informacje mają charakter edukacyjny i nie zastępują konsultacji dermatologicznej.
          </p>
        </div>
      </div>
    </footer>
  );
}

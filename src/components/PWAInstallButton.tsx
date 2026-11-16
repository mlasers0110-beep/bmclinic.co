import { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'light' | 'dark' | 'subtle';
  className?: string;
}

export function PWAInstallButton({
  variant = 'subtle',
  className = '',
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonStyles = {
    light:
      'border border-white/30 text-white hover:bg-white/10 px-6 py-3.5 rounded-full text-sm font-sans font-medium',
    dark:
      'bg-navy-800 text-white hover:bg-navy-900 px-5 py-3 rounded-full text-sm font-sans font-medium',
    subtle:
      'border border-skin-200 bg-white text-navy-800 hover:bg-skin-50 px-4 py-2.5 rounded-full text-xs font-sans font-medium',
  }[variant];

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`min-h-[44px] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 touch-manipulation ${buttonStyles} ${className}`}
      >
        {isInstallable ? <Download size={15} /> : <Smartphone size={15} />}
        <span>{isInstallable ? 'Zainstaluj aplikację' : 'Wersja na telefon'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-950/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-skin-200 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-serif text-2xl text-navy-900">
                  Zainstaluj MySkinCode na telefonie
                </h3>
                <p className="text-xs text-navy-400 font-sans mt-0.5">
                  Aplikacja mobilna PWA — działa pełnoekranowo i offline
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Zamknij instrukcję"
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-navy-400 hover:text-navy-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-navy-600 font-sans">
              <div className="rounded-2xl bg-skin-50 border border-skin-100 p-4">
                <p className="font-medium text-navy-900 mb-2 flex items-center gap-2">
                  <Share size={15} className="text-gold-600" />
                  {isIOS ? 'Instrukcja dla Twojego iPhone’a / iPada:' : 'iPhone / iPad (Safari):'}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-navy-600 leading-relaxed">
                  <li>Otwórz tę stronę w przeglądarce <strong>Safari</strong> na telefonie.</li>
                  <li>Stuknij ikonę <strong>Udostępnij</strong> na dolnym pasku narzędzi.</li>
                  <li>Wybierz opcję <strong>Dodaj do ekranu początkowego</strong>.</li>
                </ol>
              </div>

              <div className="rounded-2xl bg-skin-50 border border-skin-100 p-4">
                <p className="font-medium text-navy-900 mb-2 flex items-center gap-2">
                  <PlusSquare size={15} className="text-gold-600" />
                  Android (Chrome / Edge / Samsung Internet):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-navy-600 leading-relaxed">
                  <li>Otwórz menu przeglądarki (trzy kropki w prawym górnym rogu).</li>
                  <li>Wybierz <strong>Zainstaluj aplikację</strong> lub <strong>Dodaj do ekranu głównego</strong>.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[48px] rounded-xl bg-navy-800 text-white text-sm font-sans font-medium hover:bg-navy-900 transition-colors"
            >
              Rozumiem
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:right-auto z-50 flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-sans font-medium text-white shadow-lg">
      <WifiOff size={14} className="text-gold-400 flex-shrink-0" />
      <span>Tryb offline — analiza parametrów i zapisane wyniki działają lokalnie.</span>
    </div>
  );
}

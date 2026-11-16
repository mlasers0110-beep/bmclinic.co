import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Scan,
  Camera,
  Box,
  History,
  SlidersHorizontal,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { DEFAULT_SKIN_PARAMETERS } from '../lib/skinParameters';

const PHENOTYPE_EXAMPLES = [
  { code: 'MSC-SEB-G2', label: 'Łojotokowa', sub: 'Stopień strukturalny' },
  { code: 'MSC-VAS-G1', label: 'Naczynkowa', sub: 'Stopień powierzchowny' },
  { code: 'MSC-AGE-G3', label: 'Dojrzała', sub: 'Stopień utrwalony' },
  { code: 'MSC-NOR-G0', label: 'Normalna', sub: 'Równowaga' },
  { code: 'MSC-XER-G2', label: 'Sucha', sub: 'Stopień strukturalny' },
  { code: 'MSC-MIX-G1', label: 'Mieszana', sub: 'Stopień powierzchowny' },
];

const HOW_STEPS = [
  {
    number: '01',
    title: 'Wybierz badane parametry lub kwestionariusz',
    description:
      'Skorzystaj z 10-etapowego wywiadu lub skonfiguruj własny zestaw parametrów biofizycznych skóry (sebum, TEWL, korneometria, naczynia).',
  },
  {
    number: '02',
    title: 'Przeanalizuj odchylenia i kod MSC-MATRIX',
    description:
      'System porównuje wyniki z normami klinicznymi, wylicza Indeks Równowagi Skóry, wykres radarowy oraz unikalny kod MSC.',
  },
  {
    number: '03',
    title: 'Śledź postępy na telefonie i w gabinecie',
    description:
      'Otrzymaj celowane składniki aktywne, zainstaluj aplikację mobilną PWA na ekranie głównym i porównuj wyniki w czasie.',
  },
];

const PHENOTYPE_CLASSES = [
  { code: 'SEB', name: 'Łojotokowa', desc: 'Nadmiar sebum, rozszerzone pory, skłonność do zmian trądzikowych' },
  { code: 'XER', name: 'Sucha', desc: 'Zaburzona bariera hydrolipidowa, ściągnięcie, podwyższone TEWL' },
  { code: 'VAS', name: 'Naczynkowa', desc: 'Teleangiektazje, rumień napadowy, nadreaktywność termiczna' },
  { code: 'AGE', name: 'Dojrzała', desc: 'Spadek gęstości kolagenu, zmarszczki, fotostarzenie' },
  { code: 'OIL', name: 'Tłusta', desc: 'Intensywne błyszczenie całodobowe, nadczynność gruczołów łojowych' },
  { code: 'MIX', name: 'Mieszana', desc: 'Złożona topografia: łojotokowa strefa T i odwodnione policzki' },
  { code: 'NOR', name: 'Normalna', desc: 'Fizjologiczna homeostaza wodno-lipidowa i wysoka tolerancja' },
  { code: 'CIC', name: 'Z bliznami', desc: 'Przebarwienia pozapalne (PIH), nierówny koloryt i blizny' },
  { code: 'REM', name: 'Przebudowana', desc: 'Skóra po zabiegach estetycznych lub laserowych w fazie regeneracji' },
];

export default function LandingPage() {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-skin-900/60">
          {!heroImgFailed && (
            <img
              src="https://images.pexels.com/photos/3762875/pexels-photo-3762875.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="Diagnostyka i pielęgnacja skóry MySkinCode"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover opacity-55"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-900/75 to-navy-950/40" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-28 md:py-40 w-full">
          <div className="max-w-2xl animate-fade-in">
            <p className="text-xs font-sans text-gold-300 tracking-wide mb-4">
              System klasyfikacji i diagnostyki parametrów MSC-MATRIX
            </p>

            <h1
              className="font-serif text-4xl sm:text-5xl md:text-7xl font-light text-white leading-[1.08] mb-6"
              style={{ textWrap: 'balance' }}
            >
              Twój unikalny <span className="text-gold-300 italic">kod i profil skóry</span>
            </h1>

            <p className="text-base sm:text-lg text-white/75 font-sans font-light leading-relaxed mb-8 max-w-xl">
              Połącz wywiad kliniczny z interaktywną analizą badanych parametrów skóry.
              Dostosuj zakres pomiarów, sprawdź odchylenia od normy i korzystaj z aplikacji wygodnie na telefonie.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3.5">
              <Link
                to="/analiza"
                className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-gold-500 text-white px-7 py-3.5 rounded-full font-sans font-medium text-sm tracking-wide transition-colors duration-200 hover:bg-gold-600 group touch-manipulation"
              >
                Rozpocznij analizę
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/skaner"
                className="min-h-[48px] inline-flex items-center justify-center gap-2 border border-white/40 bg-white/10 text-white px-7 py-3.5 rounded-full font-sans font-medium text-sm tracking-wide transition-colors duration-200 hover:bg-white/20 touch-manipulation"
              >
                <Camera size={15} />
                Pulpit aparatu i skaner 3D LiDAR
              </Link>
              <Link
                to="/parametry"
                className="min-h-[48px] inline-flex items-center justify-center gap-2 border border-white/30 text-white px-6 py-3.5 rounded-full font-sans font-medium text-sm tracking-wide transition-colors duration-200 hover:bg-white/10 touch-manipulation"
              >
                <SlidersHorizontal size={15} />
                Parametry skóry
              </Link>
              <PWAInstallButton variant="light" />
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-md mt-10 pt-8 border-t border-white/15">
              {[
                { value: '9', label: 'Klas klinicznych' },
                { value: '3D LiDAR', label: 'Wideo + mapa głębi' },
                { value: 'PWA', label: 'Wersja na telefon' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-serif text-2xl sm:text-3xl text-white font-light tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs text-white/60 font-sans mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <a
          href="#jak-to-dziala"
          className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors"
          aria-label="Przewiń w dół"
        >
          <ChevronDown size={24} />
        </a>
      </section>

      {/* Code examples strip */}
      <section className="bg-navy-900 py-4 overflow-hidden">
        <div
          className="flex gap-6 animate-[scroll_24s_linear_infinite]"
          style={{ width: 'max-content' }}
        >
          {[...PHENOTYPE_EXAMPLES, ...PHENOTYPE_EXAMPLES].map((ex, i) => (
            <div key={i} className="flex items-center gap-3 px-4">
              <span className="font-serif text-lg text-gold-300 whitespace-nowrap">{ex.code}</span>
              <span className="text-navy-300 text-xs font-sans whitespace-nowrap">
                — {ex.label} ({ex.sub})
              </span>
              <span className="text-navy-700 mx-2">·</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="jak-to-dziala" className="py-20 md:py-24 bg-skin-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mb-14">
            <p className="text-xs font-sans text-gold-600 mb-2">Proces diagnostyczny</p>
            <h2 className="section-title">Trzy kroki do pełnego profilu skóry</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step) => (
              <div key={step.number} className="bg-white rounded-2xl border border-skin-100 p-6">
                <div className="font-serif text-5xl font-light text-skin-300 mb-4 leading-none tabular-nums">
                  {step.number}
                </div>
                <h3 className="font-serif text-xl text-navy-900 mb-2.5">{step.title}</h3>
                <p className="text-sm text-navy-500 font-sans leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configurable Skin Parameters Preview */}
      <section className="py-20 md:py-24 bg-white border-y border-skin-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-sans text-gold-600 mb-2">
                Konfigurowalna matryca pomiarowa
              </p>
              <h2 className="section-title">
                Zmieniaj i analizuj badane parametry skóry
              </h2>
              <p className="text-sm text-navy-500 font-sans mt-3 leading-relaxed">
                Włączaj wybrane wskaźniki biofizyczne, nadawaj im wagi diagnostyczne, dodawaj własne
                parametry gabinetowe i obserwuj na żywo ich wpływ na Indeks Równowagi oraz kod MSC.
              </p>
            </div>

            <Link
              to="/parametry"
              className="btn-primary min-h-[48px] inline-flex items-center justify-center gap-2 self-start lg:self-auto whitespace-nowrap"
            >
              Otwórz panel parametrów
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFAULT_SKIN_PARAMETERS.map((param) => (
              <div
                key={param.id}
                className="rounded-2xl bg-skin-50 border border-skin-100 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-sans text-navy-400">{param.category}</span>
                    <span className="text-xs font-sans text-gold-600 tabular-nums">
                      norma {param.optimalMin}–{param.optimalMax}
                      {param.unit}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl text-navy-900 mb-2">{param.name}</h3>
                  <p className="text-xs text-navy-500 font-sans leading-relaxed">
                    {param.description}
                  </p>
                </div>
                <p className="text-[11px] text-navy-400 font-sans mt-4 pt-3 border-t border-skin-200/60">
                  Składniki: {param.recommendedActives.split(',').slice(0, 2).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Camera Control Dashboard & 3D LiDAR Reconstruction */}
      <section className="py-20 md:py-24 bg-navy-950 text-white border-b border-navy-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-sans text-gold-300 mb-2">
                Akwizycja optyczna i skanowanie przestrzenne ToF
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-light text-white leading-tight">
                Pulpit aparatu fotograficznego i rekonstrukcja modeli 3D z LiDAR
              </h2>
              <p className="text-sm text-navy-300 font-sans mt-3 leading-relaxed">
                Kontroluj ekspozycję, czułość ISO, migawkę i ostrość manualną, kalibruj balans bieli
                pipetą punktową lub na wzorcu 18% szarości oraz rejestruj jednocześnie film wideo ze
                strumieniem głębi LiDAR do budowy interaktywnej siatki 3D skóry.
              </p>
            </div>

            <Link
              to="/skaner"
              className="btn-gold min-h-[48px] inline-flex items-center justify-center gap-2 self-start lg:self-auto whitespace-nowrap"
            >
              <Camera size={16} />
              Uruchom pulpit aparatu i LiDAR
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-navy-900/90 border border-navy-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-sans text-gold-300">Sterowanie optyką i WB</span>
                <Camera size={18} className="text-gold-400" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">
                Manualne parametry i kalibracja bieli
              </h3>
              <p className="text-xs text-navy-300 font-sans leading-relaxed">
                Pełna regulacja ekspozycji EV, ISO (100–3200), czasu migawki, zoomu optycznego oraz
                temperatury barwowej (2800K–8500K) z adaptacją chromatyczną von Kriesa i pomiarem ΔE.
              </p>
            </div>

            <div className="rounded-2xl bg-navy-900/90 border border-navy-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-sans text-gold-300">Czujniki diagnostyczne na żywo</span>
                <Scan size={18} className="text-gold-400" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">
                Czujnik światła i czujnik ostrości
              </h3>
              <p className="text-xs text-navy-300 font-sans leading-relaxed">
                Fotometryczny pomiar natężenia (lx), symetrii oświetlenia i odblasków naskórkowych
                oraz analiza ostrości operatorami Sobela i Laplace&apos;a z podglądem Focus Peaking.
              </p>
            </div>

            <div className="rounded-2xl bg-navy-900/90 border border-navy-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-sans text-gold-300">Wideo + LiDAR ToF → Siatka 3D</span>
                <Box size={18} className="text-gold-400" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">
                Tworzenie modeli 3D powierzchni skóry
              </h3>
              <p className="text-xs text-navy-300 font-sans leading-relaxed">
                Synchroniczny zapis filmu (.webm) oraz pakietów głębi LiDAR z wieloklatkową fuzją
                geometrii 3D, pomiarem szorstkości Ra (µm) i eksportem modeli do formatów .PLY i .OBJ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9 Clinical Phenotypes */}
      <section className="py-20 md:py-24 bg-skin-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-sans text-gold-600 mb-2">Taksonomia MSC-MATRIX</p>
            <h2 className="section-title">9 klinicznych klas skóry</h2>
            <p className="text-sm text-navy-500 font-sans mt-3 leading-relaxed">
              Format zapisu: <strong className="text-navy-800">MSC-[FENOTYP]-[STOPIEŃ]</strong> lub
              złożony profil dwufenotypowy{' '}
              <strong className="text-navy-800">MSC-[FENOTYP]-[STOPIEŃ]/[FENOTYP]-[STOPIEŃ]</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PHENOTYPE_CLASSES.map((ph) => (
              <div
                key={ph.code}
                className="bg-white rounded-2xl p-5 border border-skin-100"
              >
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="font-serif text-xl text-navy-900">{ph.name}</h3>
                  <span className="text-xs font-sans text-gold-600 font-medium">{ph.code}</span>
                </div>
                <p className="text-xs text-navy-500 font-sans leading-relaxed">{ph.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile & Capabilities strip */}
      <section className="py-20 bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                Icon: Scan,
                title: 'Podwójny tryb badania',
                desc: 'Łącz subiektywny kwestionariusz pacjenta z obiektywną kalibracją mierzonych parametrów skóry.',
              },
              {
                Icon: Smartphone,
                title: 'Dedykowana wersja na telefon',
                desc: 'Dolna nawigacja obsługiwana jedną ręką, powiększone strefy dotyku i instalacja PWA na iOS oraz Android.',
              },
              {
                Icon: History,
                title: 'Porównywanie w czasie',
                desc: 'Monitoruj zmiany stopnia nasilenia (G0–G3) i Indeksu Równowagi pomiędzy wizytami.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={19} className="text-gold-400" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white mb-2">{title}</h3>
                  <p className="text-sm text-navy-300 font-sans leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

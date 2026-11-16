import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getStoredShareToken, supabase } from '../lib/supabase';
import { PHENOTYPE_LABELS, DEGREE_LABELS } from '../lib/mscMatrix';
import {
  analyzeSkinParameters,
  extractParametersFromAnswers,
} from '../lib/skinParameters';
import type { Phenotype, Degree } from '../types';

interface Analysis {
  id: string;
  created_at: string;
  patient_name: string | null;
  patient_age: number | null;
  msc_primary_phenotype: string;
  msc_primary_degree: string;
  msc_secondary_phenotype: string | null;
  msc_secondary_degree: string | null;
  msc_code: string;
  answers?: Record<string, string>;
}

const DEGREE_ORDER: Record<Degree, number> = { G0: 0, G1: 1, G2: 2, G3: 3 };

function DeltaIcon({ prev, current }: { prev: Degree; current: Degree }) {
  const diff = DEGREE_ORDER[current] - DEGREE_ORDER[prev];
  if (diff < 0) return <TrendingDown size={14} className="text-emerald-600" />;
  if (diff > 0) return <TrendingUp size={14} className="text-rose-500" />;
  return <Minus size={14} className="text-navy-400" />;
}

export default function HistoryPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const effectiveToken = token || getStoredShareToken();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    if (!effectiveToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    supabase
      .from('analyses')
      .select(
        'id, created_at, patient_name, patient_age, msc_primary_phenotype, msc_primary_degree, msc_secondary_phenotype, msc_secondary_degree, msc_code, answers'
      )
      .eq('share_token', effectiveToken)
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError('Nie udało się wczytać historii.');
        } else {
          setAnalyses((data as Analysis[]) ?? []);
        }
        setLoading(false);
      });
  }, [effectiveToken]);

  const handleTokenLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tokenInput.trim();
    if (!cleaned) return;
    // Accept full share URL or raw token
    const extracted = cleaned.includes('/historia/')
      ? cleaned.split('/historia/').pop()?.split(/[?#]/)[0] ?? cleaned
      : cleaned;
    if (extracted) {
      navigate(`/historia/${extracted}`);
      setTokenInput('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-skin-50">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-skin-200 border-t-gold-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />

      <main className="flex-1 pt-12 md:pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <Link
            to="/"
            className="min-h-[44px] inline-flex items-center gap-1.5 text-navy-400 hover:text-navy-700 text-sm font-sans transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Strona główna
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-sans text-gold-600 mb-1.5">Oś czasu terapii skóry</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-navy-900 font-light">
                {analyses[0]?.patient_name
                  ? `Historia skóry — ${analyses[0].patient_name}`
                  : 'Historia analiz i parametrów'}
              </h1>
              {analyses[0]?.patient_age && (
                <p className="text-sm text-navy-400 font-sans mt-1 tabular-nums">
                  {analyses[0].patient_age} lat
                </p>
              )}
            </div>

            {/* Token lookup form */}
            <form onSubmit={handleTokenLookup} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Wklej token lub link pacjenta…"
                className="min-h-[44px] flex-1 md:w-56 border border-skin-200 rounded-xl px-3.5 py-2 text-xs font-sans text-navy-800 bg-white focus:outline-none focus:border-gold-400"
              />
              <button
                type="submit"
                aria-label="Szukaj tokenu"
                className="min-h-[44px] px-4 rounded-xl bg-navy-800 text-white text-xs font-sans font-medium hover:bg-navy-900 transition-colors inline-flex items-center gap-1.5 shrink-0 touch-manipulation"
              >
                <Search size={14} />
                <span>Wczytaj</span>
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 items-center mb-6">
              <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-700 font-sans">{error}</p>
            </div>
          )}

          {!error && analyses.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-navy-500 font-sans text-sm mb-6">
                Brak zapisanych analiz na tym urządzeniu lub dla podanego tokenu.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/analiza"
                  className="btn-primary min-h-[48px] inline-flex items-center gap-2"
                >
                  Kwestionariusz skóry
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/parametry"
                  className="btn-outline min-h-[48px] inline-flex items-center gap-2"
                >
                  <SlidersHorizontal size={14} />
                  Badaj parametry skóry
                </Link>
              </div>
            </div>
          )}

          {analyses.length > 0 && (
            <>
              {/* Summary card */}
              <div className="card mb-8 bg-navy-900 text-white border-0">
                <p className="text-xs font-sans text-navy-400 mb-4">Podsumowanie przebiegu</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-serif text-3xl text-white font-light tabular-nums">
                      {analyses.length}
                    </div>
                    <div className="text-xs text-navy-400 font-sans mt-1">Analiz łącznie</div>
                  </div>
                  <div>
                    <div className="font-serif text-3xl text-gold-300 font-light">
                      {analyses[analyses.length - 1].msc_primary_phenotype}
                    </div>
                    <div className="text-xs text-navy-400 font-sans mt-1">Aktualny fenotyp</div>
                  </div>
                  <div>
                    <div className="font-serif text-3xl text-white font-light">
                      {analyses[analyses.length - 1].msc_primary_degree}
                    </div>
                    <div className="text-xs text-navy-400 font-sans mt-1">Aktualny stopień</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-skin-200" />

                <div className="space-y-6">
                  {analyses.map((item, i) => {
                    const prevAnalysis = i > 0 ? analyses[i - 1] : null;
                    const isLatest = i === analyses.length - 1;
                    const date = new Date(item.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    const extractedParams = extractParametersFromAnswers(item.answers);
                    const paramSummary = analyzeSkinParameters(extractedParams);

                    return (
                      <div key={item.id} className="relative flex gap-4 sm:gap-6">
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 tabular-nums ${
                            isLatest
                              ? 'bg-gold-500 border-gold-400 text-white'
                              : 'bg-white border-skin-200 text-navy-500'
                          }`}
                        >
                          <span className="font-sans text-xs font-medium">{i + 1}</span>
                        </div>

                        <div className="flex-1 pb-2 min-w-0">
                          <div className="card">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                                  <span className="font-serif text-xl text-navy-900">
                                    {item.msc_code}
                                  </span>
                                  {isLatest && (
                                    <span className="text-xs font-sans text-gold-600 font-medium">
                                      · Aktualny wynik
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-navy-400 font-sans">
                                  {date} · Indeks równowagi {paramSummary.balanceIndex}/100 ·{' '}
                                  {paramSummary.examinedParameters.length} parametrów
                                </p>
                              </div>

                              <Link
                                to={`/wyniki/${item.id}`}
                                className="min-h-[40px] inline-flex items-center gap-1 text-xs font-sans font-medium text-navy-700 hover:text-navy-950 transition-colors flex-shrink-0"
                              >
                                Raport
                                <ArrowRight size={13} />
                              </Link>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                              <div>
                                <span className="text-xs text-navy-400 font-sans">Fenotyp: </span>
                                <span className="text-navy-700 font-sans font-medium">
                                  {PHENOTYPE_LABELS[item.msc_primary_phenotype as Phenotype]}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-navy-400 font-sans">Stopień: </span>
                                <span className="text-navy-700 font-sans font-medium">
                                  {DEGREE_LABELS[item.msc_primary_degree as Degree]}
                                </span>
                                {prevAnalysis && (
                                  <DeltaIcon
                                    prev={prevAnalysis.msc_primary_degree as Degree}
                                    current={item.msc_primary_degree as Degree}
                                  />
                                )}
                              </div>
                            </div>

                            {item.msc_secondary_phenotype && (
                              <p className="text-xs text-navy-400 font-sans mt-2">
                                Komponent dodatkowy:{' '}
                                {PHENOTYPE_LABELS[item.msc_secondary_phenotype as Phenotype]} (
                                {item.msc_secondary_degree})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/analiza"
                  className="btn-primary min-h-[48px] inline-flex items-center gap-2 group"
                >
                  Nowy kwestionariusz
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  to="/parametry"
                  className="btn-outline min-h-[48px] inline-flex items-center gap-2"
                >
                  <SlidersHorizontal size={14} />
                  Nowe badanie parametrów
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

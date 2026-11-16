import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  History,
  Check,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Save,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MSCCodeBadge from '../components/MSCCodeBadge';
import PhenotypeCard from '../components/PhenotypeCard';
import SkinParameterAnalyzerPanel from '../components/SkinParameterAnalyzerPanel';
import { supabase } from '../lib/supabase';
import {
  PHENOTYPE_LABELS,
  DEGREE_LABELS,
  PHENOTYPE_DESCRIPTIONS,
} from '../lib/mscMatrix';
import {
  analyzeSkinParameters,
  buildParameterAwareRecommendations,
  extractParametersFromAnswers,
  saveParameterConfigs,
  serializeParametersIntoAnswers,
} from '../lib/skinParameters';
import type { Phenotype, Degree, SkinParameterConfig } from '../types';
import type { Recommendation } from '../types/database';

interface Analysis {
  id: string;
  share_token: string;
  created_at: string;
  patient_name: string | null;
  patient_age: number | null;
  msc_primary_phenotype: string;
  msc_primary_degree: string;
  msc_secondary_phenotype: string | null;
  msc_secondary_degree: string | null;
  msc_code: string;
  phenotype_scores: Record<string, number>;
  answers: Record<string, string>;
  recommendations: Recommendation[];
  notes: string | null;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet średni',
  low: 'Priorytet niski',
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [paramConfigs, setParamConfigs] = useState<SkinParameterConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Nie znaleziono wyników analizy.');
        } else {
          const loaded = data as Analysis;
          setAnalysis(loaded);
          setParamConfigs(extractParametersFromAnswers(loaded.answers));
          setHasUnsavedChanges(false);
        }
        setLoading(false);
      });
  }, [id]);

  const paramAnalysis = useMemo(
    () => (paramConfigs.length > 0 ? analyzeSkinParameters(paramConfigs) : null),
    [paramConfigs]
  );

  const handleToggleExaminedParam = (paramId: string) => {
    const enabledCount = paramConfigs.filter((c) => c.enabled).length;
    const target = paramConfigs.find((c) => c.id === paramId);
    if (!target || (target.enabled && enabledCount <= 1)) return;

    const next = paramConfigs.map((c) =>
      c.id === paramId ? { ...c, enabled: !c.enabled } : c
    );
    setParamConfigs(next);
    setHasUnsavedChanges(true);
  };

  const handleUpdateParameter = (
    paramId: string,
    patch: Partial<SkinParameterConfig>
  ) => {
    const next = paramConfigs.map((c) =>
      c.id === paramId ? { ...c, ...patch } : c
    );
    setParamConfigs(next);
    setHasUnsavedChanges(true);
  };

  const handleSaveRecalculated = async () => {
    if (!analysis || !paramAnalysis) return;
    setSavingUpdate(true);

    const updatedRecommendations = buildParameterAwareRecommendations(paramAnalysis);
    const updatedAnswers = serializeParametersIntoAnswers(
      analysis.answers ?? {},
      paramConfigs
    );
    saveParameterConfigs(paramConfigs);

    const patch = {
      msc_primary_phenotype: paramAnalysis.mscCode.primary.phenotype,
      msc_primary_degree: paramAnalysis.mscCode.primary.degree,
      msc_secondary_phenotype: paramAnalysis.mscCode.secondary?.phenotype ?? null,
      msc_secondary_degree: paramAnalysis.mscCode.secondary?.degree ?? null,
      msc_code: paramAnalysis.mscCode.code,
      phenotype_scores: paramAnalysis.phenotypeScores,
      answers: updatedAnswers,
      recommendations: updatedRecommendations,
    };

    const { error: updateErr } = await supabase
      .from('analyses')
      .update(patch as never)
      .eq('id', analysis.id);

    setSavingUpdate(false);

    if (!updateErr) {
      setAnalysis({
        ...analysis,
        ...patch,
      });
      setHasUnsavedChanges(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    }
  };

  const handleShare = () => {
    if (!analysis) return;
    const url = `${window.location.origin}/historia/${analysis.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-skin-50">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-skin-200 border-t-gold-500 animate-spin mx-auto mb-4" />
            <p className="text-navy-400 font-sans text-sm">Wczytywanie wyników…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex flex-col bg-skin-50">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-16 px-6">
          <div className="text-center max-w-sm">
            <AlertCircle size={40} className="text-rose-400 mx-auto mb-4" />
            <h2 className="font-serif text-xl text-navy-900 mb-2">Nie znaleziono wyników</h2>
            <p className="text-navy-500 font-sans text-sm mb-6">
              {error || 'Ten link jest nieprawidłowy lub analiza została usunięta.'}
            </p>
            <Link to="/analiza" className="btn-primary inline-flex items-center gap-2">
              <RefreshCw size={14} />
              Nowa analiza
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // When user modifies sliders live in editMode, preview recalculated MSC code & recommendations
  const activeCode =
    hasUnsavedChanges && paramAnalysis ? paramAnalysis.mscCode.code : analysis.msc_code;
  const primaryPhenotype = (
    hasUnsavedChanges && paramAnalysis
      ? paramAnalysis.mscCode.primary.phenotype
      : analysis.msc_primary_phenotype
  ) as Phenotype;
  const primaryDegree = (
    hasUnsavedChanges && paramAnalysis
      ? paramAnalysis.mscCode.primary.degree
      : analysis.msc_primary_degree
  ) as Degree;
  const secondaryPhenotype = (
    hasUnsavedChanges && paramAnalysis
      ? paramAnalysis.mscCode.secondary?.phenotype
      : analysis.msc_secondary_phenotype
  ) as Phenotype | undefined;
  const secondaryDegree = (
    hasUnsavedChanges && paramAnalysis
      ? paramAnalysis.mscCode.secondary?.degree
      : analysis.msc_secondary_degree
  ) as Degree | undefined;

  const scores =
    hasUnsavedChanges && paramAnalysis
      ? paramAnalysis.phenotypeScores
      : analysis.phenotype_scores;
  const maxScore = Math.max(1, ...Object.values(scores));
  const sortedPhenotypes = (Object.entries(scores) as [Phenotype, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0);

  const displayedRecommendations =
    hasUnsavedChanges && paramAnalysis
      ? buildParameterAwareRecommendations(paramAnalysis)
      : analysis.recommendations;

  const date = new Date(analysis.created_at).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />

      <main className="flex-1 pt-12 md:pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Top navigation + date */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 text-navy-400 hover:text-navy-700 text-sm font-sans transition-colors"
            >
              <ArrowLeft size={14} />
              Strona główna
            </Link>
            <span className="text-xs text-navy-400 font-sans">{date}</span>
          </div>

          {analysis.patient_name && (
            <p className="text-sm text-navy-400 font-sans mb-2">
              Wyniki dla: <span className="text-navy-700 font-medium">{analysis.patient_name}</span>
              {analysis.patient_age && (
                <span className="text-navy-500"> · {analysis.patient_age} lat</span>
              )}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 font-light leading-tight">
              Raport kodu i parametrów skóry
            </h1>
            {savedToast && (
              <span className="inline-flex items-center gap-1.5 text-xs font-sans text-emerald-700 font-medium">
                <CheckCircle size={14} />
                Zaktualizowano parametry badania
              </span>
            )}
          </div>

          {/* MSC Code badge */}
          <div className="mb-8">
            <MSCCodeBadge
              code={activeCode}
              primaryPhenotype={primaryPhenotype}
              primaryDegree={primaryDegree}
              secondaryPhenotype={secondaryPhenotype}
              secondaryDegree={secondaryDegree}
              size="lg"
            />
          </div>

          {/* Primary phenotype description */}
          <div className="card mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-navy-400 font-sans mb-1">Główna klasa skóry</p>
                <h2 className="font-serif text-2xl text-navy-900">
                  Skóra {PHENOTYPE_LABELS[primaryPhenotype].toLowerCase()}
                </h2>
                <p className="text-sm text-gold-600 font-sans mt-0.5">
                  Stopień: {DEGREE_LABELS[primaryDegree]} ({primaryDegree})
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-serif text-2xl text-navy-900">{primaryPhenotype}</div>
                <div className="text-xs text-navy-400 font-sans">{primaryDegree}</div>
              </div>
            </div>

            <p className="text-sm text-navy-600 font-sans leading-relaxed">
              {PHENOTYPE_DESCRIPTIONS[primaryPhenotype]}
            </p>

            {secondaryPhenotype && (
              <div className="mt-4 pt-4 border-t border-skin-100">
                <p className="text-xs text-navy-400 font-sans mb-1">Komponent drugorzędny</p>
                <p className="text-sm text-navy-600 font-sans">
                  <strong className="text-navy-800">
                    {PHENOTYPE_LABELS[secondaryPhenotype]}
                  </strong>{' '}
                  ({secondaryPhenotype}-{secondaryDegree}) —{' '}
                  {PHENOTYPE_DESCRIPTIONS[secondaryPhenotype].split('.')[0]}.
                </p>
              </div>
            )}
          </div>

          {/* Skin Parameter Analysis & Live Customization Section */}
          {paramAnalysis && (
            <section className="mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-navy-900">
                    Analiza badanych parametrów skóry
                  </h2>
                  <p className="text-xs sm:text-sm text-navy-500 font-sans mt-0.5">
                    Ocena wyświetlanych parametrów względem norm referencyjnych MSC-MATRIX
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode((v) => !v)}
                    className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-sans font-medium border transition-colors touch-manipulation ${
                      editMode
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-navy-800 border-skin-200 hover:bg-skin-100'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    <span>{editMode ? 'Zakończ edycję parametrów' : 'Zmień badane parametry'}</span>
                  </button>

                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleSaveRecalculated}
                      disabled={savingUpdate}
                      className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500 text-white text-xs sm:text-sm font-sans font-medium hover:bg-gold-600 transition-colors touch-manipulation"
                    >
                      <Save size={14} />
                      <span>{savingUpdate ? 'Zapisywanie…' : 'Zapisz korektę'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active parameter toggles when editMode is open */}
              {editMode && (
                <div className="bg-white rounded-2xl border border-skin-200 p-4 sm:p-5 mb-5">
                  <p className="text-xs text-navy-500 font-sans mb-3">
                    Wybierz parametry wyświetlane i uwzględniane w bieżącej analizie:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {paramConfigs.map((param) => (
                      <button
                        key={param.id}
                        type="button"
                        onClick={() => handleToggleExaminedParam(param.id)}
                        className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs font-sans transition-colors touch-manipulation ${
                          param.enabled
                            ? 'border-navy-800 bg-navy-900 text-white'
                            : 'border-skin-200 bg-skin-50 text-navy-500'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                            param.enabled
                              ? 'bg-gold-500 border-gold-500 text-white'
                              : 'border-skin-300 bg-white'
                          }`}
                        >
                          {param.enabled && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className="truncate font-medium">{param.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SkinParameterAnalyzerPanel
                analysis={paramAnalysis}
                allConfigs={paramConfigs}
                editable={editMode}
                onUpdateParameter={handleUpdateParameter}
              />
            </section>
          )}

          {/* Phenotype scores */}
          <div className="mb-10">
            <h2 className="font-serif text-2xl text-navy-900 mb-4">Profil fenotypów</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedPhenotypes.map(([ph, score]) => (
                <PhenotypeCard
                  key={ph}
                  phenotype={ph}
                  score={score}
                  maxScore={maxScore}
                  isPrimary={ph === primaryPhenotype}
                />
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-10">
            <h2 className="font-serif text-2xl text-navy-900 mb-4">
              Zalecenia pielęgnacyjne i korekcyjne
            </h2>
            <div className="space-y-3">
              {displayedRecommendations.map((rec, i) => (
                <div key={i} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs font-sans text-navy-400">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle size={13} className="text-gold-500 flex-shrink-0" />
                      <span>{rec.category}</span>
                    </span>
                    <span
                      className={
                        rec.priority === 'high'
                          ? 'text-rose-700 font-medium'
                          : rec.priority === 'medium'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }
                    >
                      {PRIORITY_LABELS[rec.priority] ?? 'Zalecenie'}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg text-navy-900 mb-1">{rec.title}</h3>
                  <p className="text-sm text-navy-500 font-sans leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-skin-100 p-5 sm:p-6">
            <h3 className="font-serif text-lg text-navy-900 mb-4">Zapisz i udostępnij</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[48px] flex items-center justify-center gap-2 border border-skin-200 bg-skin-50 text-navy-700 px-4 py-3 rounded-xl text-sm font-sans font-medium hover:bg-skin-100 transition-colors touch-manipulation"
              >
                {copied ? (
                  <CheckCircle size={15} className="text-emerald-600" />
                ) : (
                  <Share2 size={15} />
                )}
                {copied ? 'Skopiowano link!' : 'Kopiuj link historii'}
              </button>
              <Link
                to={`/historia/${analysis.share_token}`}
                className="min-h-[48px] flex items-center justify-center gap-2 border border-skin-200 bg-skin-50 text-navy-700 px-4 py-3 rounded-xl text-sm font-sans font-medium hover:bg-skin-100 transition-colors touch-manipulation"
              >
                <History size={15} />
                Historia analiz
              </Link>
              <Link
                to="/parametry"
                className="min-h-[48px] flex items-center justify-center gap-2 bg-navy-800 text-white px-4 py-3 rounded-xl text-sm font-sans font-medium hover:bg-navy-900 transition-colors touch-manipulation"
              >
                <SlidersHorizontal size={15} />
                Laboratorium parametrów
              </Link>
            </div>
          </div>

          <p className="text-xs text-navy-400 font-sans text-center mt-6 leading-relaxed">
            Wyniki mają charakter informacyjny i edukacyjny. Nie stanowią diagnozy medycznej.
            W przypadku problemów skórnych skonsultuj się z dermatologiem.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

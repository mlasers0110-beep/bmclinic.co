import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { computeMSCCode } from '../lib/mscMatrix';
import {
  PARAMETER_PRESETS,
  analyzeSkinParameters,
  applyParameterPreset,
  buildParameterAwareRecommendations,
  deriveParameterValuesFromAnswers,
  loadParameterConfigs,
  saveParameterConfigs,
  serializeParametersIntoAnswers,
} from '../lib/skinParameters';
import { supabase } from '../lib/supabase';
import type { AnalysisRow } from '../types/database';
import type { QuestionnaireAnswers, SkinParameterConfig } from '../types';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Jak wygląda Twoja skóra po oczyszczeniu twarzy?',
    options: [
      { value: 'a', label: 'Natychmiast się błyszczy i jest tłusta' },
      { value: 'b', label: 'Po kilku godzinach tłusta tylko w strefie T (czoło, nos, broda)' },
      { value: 'c', label: 'Czuję ją ściągniętą i suchą' },
      { value: 'd', label: 'Jest komfortowa — nie odczuwam dyskomfortu' },
    ],
  },
  {
    id: 'q2',
    text: 'Czy masz problemy z widocznymi porami lub zaskórnikami?',
    options: [
      { value: 'a', label: 'Tak — wyraźnie rozszerzone pory i zaskórniki na całej twarzy' },
      { value: 'b', label: 'Tylko w strefie T, na nosie i czole' },
      { value: 'c', label: 'Nie, pory są małe, skóra raczej sucha' },
      { value: 'd', label: 'Mam blizny i przebarwienia po dawnym trądziku' },
    ],
  },
  {
    id: 'q3',
    text: 'Jak reaguje Twoja skóra na stres lub zmianę temperatury?',
    options: [
      { value: 'a', label: 'Zaczerwienia się, pojawia się rumień lub piekące uczucie' },
      { value: 'b', label: 'Pojawia się więcej wyprysków lub pryszczy' },
      { value: 'c', label: 'Staje się jeszcze bardziej sucha i napięta' },
      { value: 'd', label: 'Reaguje minimalnie — skóra jest stabilna' },
    ],
  },
  {
    id: 'q4',
    text: 'Jak oceniasz wiek skóry lub jej dojrzałość?',
    options: [
      { value: 'a', label: 'Do 30 lat — bez widocznych oznak starzenia' },
      { value: 'b', label: '30–45 lat — pojawiają się pierwsze zmarszczki' },
      { value: 'c', label: '45+ lat — wyraźne zmarszczki, utrata napięcia' },
      { value: 'd', label: 'Korzystałam/-em z zabiegów medycyny estetycznej' },
    ],
  },
  {
    id: 'q5',
    text: 'Co jest Twoją główną troską dotyczącą skóry?',
    options: [
      { value: 'a', label: 'Tłustość, błyszczenie, pory, trądzik' },
      { value: 'b', label: 'Suchość, łuszczenie, ściąganie' },
      { value: 'c', label: 'Zaczerwienienie, widoczne naczynka, couperose' },
      { value: 'd', label: 'Zmarszczki, utrata elastyczności, szarość cery' },
    ],
  },
  {
    id: 'q6',
    text: 'Jak Twoja skóra reaguje na nowe kosmetyki?',
    options: [
      { value: 'a', label: 'Często się podrażnia, swędzi lub piecze' },
      { value: 'b', label: 'Czasem pojawia się wyprysk lub zaskórniki' },
      { value: 'c', label: 'Toleruje większość produktów dobrze' },
      { value: 'd', label: 'Mam bardzo wrażliwą skórę naczyniową — rumień na ciepło' },
    ],
  },
  {
    id: 'q7',
    text: 'Czy koloryt Twojej skóry jest jednolity?',
    options: [
      { value: 'a', label: 'Nie — mam blizny i przebarwienia po trądziku' },
      { value: 'b', label: 'Mam przebarwienia związane z wiekiem lub słońcem' },
      { value: 'c', label: 'Widzę teleangiektazje i plamki rumienia' },
      { value: 'd', label: 'Tak — koloryt jest w miarę równomierny' },
    ],
  },
  {
    id: 'q8',
    text: 'Czy w ostatnim roku korzystałaś/-eś z zabiegów estetycznych?',
    options: [
      { value: 'a', label: 'Tak, regularnie (botoks, kwas hialuronowy, lasery)' },
      { value: 'b', label: 'Tak, jeden lub dwa zabiegi medyczne' },
      { value: 'c', label: 'Tylko zabiegi kosmetyczne (peelingi, masaże)' },
      { value: 'd', label: 'Nie, tylko codzienna pielęgnacja domowa' },
    ],
  },
  {
    id: 'severity1',
    text: 'Jak bardzo nasilone są objawy Twojej skóry?',
    options: [
      { value: 'a', label: 'Ledwo zauważalne — widzę je tylko ja' },
      { value: 'b', label: 'Wyraźne, ale powierzchowne — widać je z bliska' },
      { value: 'c', label: 'Głęboko zakorzenione, wyraźnie wpływają na wygląd' },
      { value: 'd', label: 'Bardzo nasilone, trudne do ukrycia' },
    ],
  },
  {
    id: 'severity2',
    text: 'Jak długo trwają te problemy skórne?',
    options: [
      { value: 'a', label: 'Pojawiły się niedawno (kilka tygodni)' },
      { value: 'b', label: 'Od kilku miesięcy' },
      { value: 'c', label: 'Od kilku lat' },
      { value: 'd', label: 'Od bardzo dawna — utrwalone, chroniczne zmiany' },
    ],
  },
];

const TOTAL_STEPS = QUESTIONS.length + 2;

type AnswerKey = keyof QuestionnaireAnswers;

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [paramConfigs, setParamConfigs] = useState<SkinParameterConfig[]>(() =>
    loadParameterConfigs()
  );
  const [showParamSelector, setShowParamSelector] = useState(false);

  const questionIndex = step - 1;
  const isIntro = step === 0;
  const isProcessing = step === TOTAL_STEPS - 1;
  const currentQuestion = !isIntro && !isProcessing ? QUESTIONS[questionIndex] : null;
  const progress = Math.round((step / (TOTAL_STEPS - 1)) * 100);
  const enabledCount = paramConfigs.filter((c) => c.enabled).length;

  const handleToggleParam = (id: string) => {
    const target = paramConfigs.find((c) => c.id === id);
    if (!target || (target.enabled && enabledCount <= 1)) return;
    const next = paramConfigs.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    setParamConfigs(next);
    saveParameterConfigs(next);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PARAMETER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setParamConfigs((prev) => applyParameterPreset(prev, preset));
  };

  const handleNext = () => {
    if (isIntro) {
      setStep(1);
      setSelected(null);
      return;
    }

    if (currentQuestion) {
      if (!selected) {
        setError('Wybierz jedną z opcji, aby kontynuować.');
        return;
      }
      setError('');
      const nextAnswers = {
        ...answers,
        [currentQuestion.id as AnswerKey]: selected,
      };
      setAnswers(nextAnswers);

      if (step === QUESTIONS.length) {
        setSelected(null);
        setStep(step + 1);
        runAnalysis(nextAnswers);
      } else {
        const upcoming = QUESTIONS[step];
        setSelected(
          upcoming ? ((nextAnswers[upcoming.id as AnswerKey] as string) ?? null) : null
        );
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setError('');
    const prevQ = QUESTIONS[step - 2];
    if (prevQ) {
      setSelected((answers[prevQ.id as AnswerKey] as string) ?? null);
    } else {
      setSelected(null);
    }
    setStep(step - 1);
  };

  const handleOptionSelect = (value: string) => {
    setSelected(value);
    setError('');
  };

  async function runAnalysis(finalAnswers: Partial<QuestionnaireAnswers>) {
    const complete = finalAnswers as QuestionnaireAnswers;
    const { mscCode, phenotypeScores } = computeMSCCode(complete);

    const derivedParams = deriveParameterValuesFromAnswers(complete, paramConfigs);
    saveParameterConfigs(derivedParams);
    const paramAnalysis = analyzeSkinParameters(derivedParams);
    const recommendations = buildParameterAwareRecommendations({
      ...paramAnalysis,
      mscCode,
    });

    const serializedAnswers = serializeParametersIntoAnswers(
      complete as unknown as Record<string, string>,
      derivedParams
    );

    const payload = {
      patient_name: patientName.trim() || null,
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      msc_primary_phenotype: mscCode.primary.phenotype,
      msc_primary_degree: mscCode.primary.degree,
      msc_secondary_phenotype: mscCode.secondary?.phenotype ?? null,
      msc_secondary_degree: mscCode.secondary?.degree ?? null,
      msc_code: mscCode.code,
      phenotype_scores: phenotypeScores,
      answers: serializedAnswers,
      recommendations,
      notes: null,
    };

    const { data, error: dbError } = await supabase
      .from('analyses')
      .insert(payload as never)
      .select()
      .maybeSingle();

    if (dbError || !data) {
      setError('Wystąpił błąd podczas zapisywania analizy. Spróbuj ponownie.');
      setStep(QUESTIONS.length);
      return;
    }

    navigate(`/wyniki/${(data as AnalysisRow).id}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />

      <main className="flex-1 pt-12 md:pt-16 flex flex-col">
        {!isProcessing && (
          <div className="w-full bg-skin-100 h-1">
            <div
              className="h-1 bg-gold-500 transition-transform duration-300 origin-left"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12">
          <div className="w-full max-w-2xl animate-slide-up">
            {/* Intro step */}
            {isIntro && (
              <div>
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-navy-900 flex items-center justify-center mx-auto mb-5">
                    <span className="font-serif text-gold-400 text-lg">MSC</span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-navy-900 mb-3">
                    Analiza skóry MySkinCode
                  </h1>
                  <p className="text-navy-500 font-sans text-sm leading-relaxed max-w-lg mx-auto">
                    Odpowiedz na 10 pytań, aby wyznaczyć kod kliniczny MSC-MATRIX oraz obliczyć
                    profil wybranych parametrów biofizycznych skóry.
                  </p>
                </div>

                {/* Patient metadata */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 border border-skin-100">
                  <p className="text-xs text-navy-400 font-sans mb-3">
                    Dane karty badania (opcjonalnie)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs text-navy-500 font-sans mb-1.5">
                        Imię
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="np. Anna"
                        className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-800 bg-skin-50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-navy-500 font-sans mb-1.5">
                        Wiek
                      </label>
                      <input
                        type="number"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="np. 32"
                        min="10"
                        max="100"
                        className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-800 bg-skin-50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Examined parameters customization */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 mb-8 border border-skin-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="font-serif text-lg text-navy-900">
                        Badane parametry skóry ({enabledCount}/{paramConfigs.length})
                      </h2>
                      <p className="text-xs text-navy-400 font-sans">
                        Dostosuj, które parametry zostaną wyliczone i przeanalizowane w raporcie
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowParamSelector((v) => !v)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-skin-200 bg-skin-50 text-xs font-sans font-medium text-navy-700 hover:bg-skin-100 transition-colors touch-manipulation"
                    >
                      <SlidersHorizontal size={13} />
                      <span>{showParamSelector ? 'Zwiń listę' : 'Zmień parametry'}</span>
                    </button>
                  </div>

                  {!showParamSelector ? (
                    <p className="text-xs text-navy-600 font-sans leading-relaxed">
                      Aktywne:{' '}
                      {paramConfigs
                        .filter((c) => c.enabled)
                        .map((c) => c.shortName)
                        .join(' · ')}
                    </p>
                  ) : (
                    <div className="space-y-4 pt-3 border-t border-skin-100">
                      <div className="flex flex-wrap gap-1.5">
                        {PARAMETER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyPreset(preset.id)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-skin-200 bg-skin-50 text-xs font-sans text-navy-700 hover:bg-skin-100 transition-colors"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {paramConfigs.map((param) => (
                          <button
                            key={param.id}
                            type="button"
                            onClick={() => handleToggleParam(param.id)}
                            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs font-sans transition-colors touch-manipulation ${
                              param.enabled
                                ? 'border-navy-800 bg-navy-900 text-white'
                                : 'border-skin-200 bg-white text-navy-500'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                                param.enabled
                                  ? 'bg-gold-500 border-gold-500 text-white'
                                  : 'border-skin-300'
                              }`}
                            >
                              {param.enabled && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="truncate font-medium">{param.name}</span>
                          </button>
                        ))}
                      </div>

                      <div className="text-right">
                        <Link
                          to="/parametry"
                          className="text-xs font-sans text-gold-600 hover:text-gold-700 font-medium underline underline-offset-4"
                        >
                          Przejdź do ręcznego wprowadzania pomiarów i własnych parametrów
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-gold min-h-[48px] inline-flex items-center gap-2 group flex-1 justify-center touch-manipulation"
                  >
                    Rozpocznij kwestionariusz
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                  <Link
                    to="/parametry"
                    className="btn-outline min-h-[48px] inline-flex items-center justify-center gap-2 text-center touch-manipulation"
                  >
                    Tryb ręczny parametrów
                  </Link>
                </div>
              </div>
            )}

            {/* Question step */}
            {currentQuestion && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="min-h-[44px] flex items-center gap-1.5 text-navy-500 hover:text-navy-800 text-sm font-sans transition-colors touch-manipulation"
                  >
                    <ArrowLeft size={15} />
                    Wstecz
                  </button>
                  <span className="text-xs text-navy-400 font-sans tabular-nums">
                    Pytanie {step} z {QUESTIONS.length}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl text-navy-900 mb-6 leading-snug">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleOptionSelect(opt.value)}
                      className={`w-full min-h-[54px] text-left p-4 rounded-xl border-2 font-sans text-sm leading-relaxed transition-colors duration-150 touch-manipulation ${
                        selected === opt.value
                          ? 'border-gold-400 bg-gold-50 text-navy-900 shadow-sm'
                          : 'border-skin-200 bg-white text-navy-600 hover:border-skin-300 hover:bg-skin-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            selected === opt.value
                              ? 'border-gold-400 bg-gold-400'
                              : 'border-skin-300'
                          }`}
                        >
                          {selected === opt.value && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-rose-600 text-xs font-sans mb-4">{error}</p>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selected}
                  className={`w-full min-h-[48px] py-3.5 rounded-full font-sans font-medium text-sm tracking-wide transition-colors duration-150 flex items-center justify-center gap-2 group touch-manipulation ${
                    selected
                      ? 'bg-navy-800 text-white hover:bg-navy-900'
                      : 'bg-skin-200 text-skin-400 cursor-not-allowed'
                  }`}
                >
                  {step === QUESTIONS.length ? 'Oblicz kod i analizę parametrów' : 'Dalej'}
                  <ArrowRight
                    size={16}
                    className={`transition-transform ${
                      selected ? 'group-hover:translate-x-1' : ''
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Processing step */}
            {isProcessing && (
              <div className="text-center py-8">
                <div className="relative w-20 h-20 mx-auto mb-8">
                  <div className="w-20 h-20 rounded-full border-4 border-skin-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-gold-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={24} className="text-gold-500 animate-spin-slow" />
                  </div>
                </div>

                <h2 className="font-serif text-2xl text-navy-900 mb-3">
                  Obliczam Twój kod i parametry skóry…
                </h2>
                <p className="text-sm text-navy-400 font-sans">
                  Analizuję odpowiedzi oraz profil biofizyczny w systemie MSC-MATRIX
                </p>

                {error && (
                  <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-sans">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step indicators */}
        {!isIntro && !isProcessing && (
          <div className="flex justify-center gap-1.5 py-6">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-colors duration-200 ${
                  i + 1 < step
                    ? 'w-2 bg-gold-400'
                    : i + 1 === step
                      ? 'w-5 bg-navy-800'
                      : 'w-2 bg-skin-200'
                }`}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

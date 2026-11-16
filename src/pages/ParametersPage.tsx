import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MSCCodeBadge from '../components/MSCCodeBadge';
import SkinParameterAnalyzerPanel from '../components/SkinParameterAnalyzerPanel';
import {
  PARAMETER_PRESETS,
  analyzeSkinParameters,
  applyParameterPreset,
  buildParameterAwareRecommendations,
  loadParameterConfigs,
  resetParameterConfigs,
  saveParameterConfigs,
  serializeParametersIntoAnswers,
} from '../lib/skinParameters';
import { PHENOTYPE_LABELS } from '../lib/mscMatrix';
import { supabase } from '../lib/supabase';
import type { AnalysisRow } from '../types/database';
import type {
  ParameterPolarity,
  Phenotype,
  SkinParameterConfig,
} from '../types';

const PHENOTYPE_OPTIONS: Phenotype[] = [
  'SEB',
  'XER',
  'VAS',
  'AGE',
  'OIL',
  'MIX',
  'NOR',
  'CIC',
  'REM',
];

export default function ParametersPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<SkinParameterConfig[]>(() =>
    loadParameterConfigs()
  );
  const [activePresetId, setActivePresetId] = useState<string>('full_clinical');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Custom parameter modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Pomiar własny');
  const [customUnit, setCustomUnit] = useState('%');
  const [customMin, setCustomMin] = useState('35');
  const [customMax, setCustomMax] = useState('70');
  const [customPolarity, setCustomPolarity] = useState<ParameterPolarity>('range');
  const [customPhenotype, setCustomPhenotype] = useState<Phenotype>('XER');
  const [customActives, setCustomActives] = useState('Ceramidy, niacynamid, SPF 50+');

  const analysis = useMemo(() => analyzeSkinParameters(configs), [configs]);
  const enabledCount = configs.filter((c) => c.enabled).length;

  const updateConfigs = (next: SkinParameterConfig[]) => {
    setConfigs(next);
    saveParameterConfigs(next);
  };

  const handleToggleParameter = (id: string) => {
    const target = configs.find((c) => c.id === id);
    if (!target) return;
    // Ensure at least 1 parameter remains enabled
    if (target.enabled && enabledCount <= 1) return;

    const next = configs.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    setActivePresetId('custom');
    updateConfigs(next);
  };

  const handleUpdateParameter = (
    id: string,
    patch: Partial<SkinParameterConfig>
  ) => {
    const next = configs.map((c) => (c.id === id ? { ...c, ...patch } : c));
    updateConfigs(next);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PARAMETER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setConfigs((prev) => applyParameterPreset(prev, preset));
  };

  const handleReset = () => {
    const reset = resetParameterConfigs();
    setConfigs(reset);
    setActivePresetId('full_clinical');
  };

  const handleDeleteCustom = (id: string) => {
    const remaining = configs.filter((c) => c.id !== id);
    if (remaining.filter((c) => c.enabled).length === 0 && remaining.length > 0) {
      remaining[0] = { ...remaining[0], enabled: true };
    }
    updateConfigs(remaining);
  };

  const handleAddCustomParameter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;

    const minVal = Math.max(0, Math.min(95, parseInt(customMin, 10) || 30));
    const maxVal = Math.max(minVal + 5, Math.min(100, parseInt(customMax, 10) || 70));
    const midVal = Math.round((minVal + maxVal) / 2);

    const newParam: SkinParameterConfig = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      shortName: trimmed.length > 14 ? `${trimmed.slice(0, 13)}…` : trimmed,
      category: customCategory.trim() || 'Pomiar własny',
      unit: customUnit.trim() || '%',
      description: `Parametr zdefiniowany przez użytkownika powiązany z klasą ${customPhenotype}.`,
      optimalMin: minVal,
      optimalMax: maxVal,
      polarity: customPolarity,
      value: midVal,
      weight: 1.0,
      enabled: true,
      isCustom: true,
      linkedPhenotypes: { [customPhenotype]: 3 },
      lowHint: `Wartość parametru „${trimmed}” znajduje się poniżej zakresu referencyjnego (${minVal}–${maxVal}${customUnit}).`,
      highHint: `Wartość parametru „${trimmed}” przekracza górną granicę zakresu referencyjnego (${minVal}–${maxVal}${customUnit}).`,
      optimalHint: `Parametr „${trimmed}” mieści się w wyznaczonej normie referencyjnej.`,
      recommendedActives: customActives.trim() || 'Pielęgnacja barierowa i fotoprotekcja SPF 50+',
    };

    updateConfigs([...configs, newParam]);
    setActivePresetId('custom');
    setCustomName('');
    setShowAddModal(false);
  };

  const handleSaveAnalysis = async () => {
    setSaving(true);
    setSaveError('');

    const recommendations = buildParameterAwareRecommendations(analysis);
    const serializedAnswers = serializeParametersIntoAnswers(
      { _source: 'parameter_lab' },
      configs
    );

    const payload = {
      patient_name: patientName.trim() || null,
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      msc_primary_phenotype: analysis.mscCode.primary.phenotype,
      msc_primary_degree: analysis.mscCode.primary.degree,
      msc_secondary_phenotype: analysis.mscCode.secondary?.phenotype ?? null,
      msc_secondary_degree: analysis.mscCode.secondary?.degree ?? null,
      msc_code: analysis.mscCode.code,
      phenotype_scores: analysis.phenotypeScores,
      answers: serializedAnswers,
      recommendations,
      notes: `Analiza parametrów skóry (${analysis.examinedParameters.length} badanych parametrów · indeks równowagi ${analysis.balanceIndex}/100)`,
    };

    const { data, error } = await supabase
      .from('analyses')
      .insert(payload as never)
      .select()
      .maybeSingle();

    setSaving(false);

    if (error || !data) {
      setSaveError('Nie udało się zapisać analizy parametrów. Spróbuj ponownie.');
      return;
    }

    navigate(`/wyniki/${(data as AnalysisRow).id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />

      <main className="flex-1 pt-14 md:pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Header section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <p className="text-xs font-sans text-gold-600 mb-2">
                Diagnostyka wieloparametrowa MSC-MATRIX
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-navy-900 font-light leading-tight">
                Badane parametry i analiza skóry
              </h1>
              <p className="text-sm sm:text-base text-navy-500 font-sans mt-3 leading-relaxed">
                Wybierz zestaw badanych parametrów skóry, dostosuj ich wagi i wprowadź wartości
                pomiarowe lub obserwacyjne, aby na żywo przeanalizować odchylenia od normy oraz kod MSC.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-navy-800 text-navy-800 text-xs sm:text-sm font-sans font-medium hover:bg-navy-800 hover:text-white transition-colors whitespace-nowrap shrink-0 touch-manipulation"
              >
                <Plus size={15} />
                Dodaj parametr
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-skin-200 bg-white text-navy-600 text-xs sm:text-sm font-sans hover:bg-skin-100 transition-colors whitespace-nowrap shrink-0 touch-manipulation"
              >
                <RotateCcw size={14} />
                Domyślne
              </button>
            </div>
          </div>

          {/* Preset selector + Active parameter toggles */}
          <section className="bg-white rounded-2xl border border-skin-100 p-5 sm:p-6 mb-8">
            <div className="mb-5">
              <h2 className="font-serif text-xl sm:text-2xl text-navy-900 mb-1">
                1. Wybór i zakres badanych parametrów
              </h2>
              <p className="text-xs sm:text-sm text-navy-500 font-sans">
                Skorzystaj z gotowego profilu gabinetowego lub samodzielnie zaznacz parametry uwzględniane w analizie.
              </p>
            </div>

            {/* Clinical presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {PARAMETER_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`min-h-[48px] text-left p-4 rounded-xl border transition-colors touch-manipulation ${
                      isSelected
                        ? 'border-gold-500 bg-gold-50/70 text-navy-900'
                        : 'border-skin-200 bg-skin-50/50 text-navy-700 hover:border-skin-300 hover:bg-skin-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-serif text-base font-medium text-navy-900">
                        {preset.name}
                      </span>
                      {isSelected && <Check size={15} className="text-gold-600 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-navy-500 font-sans leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Individual parameter toggles */}
            <div className="pt-5 border-t border-skin-100">
              <p className="text-xs text-navy-400 font-sans mb-3">
                Aktywne parametry w badaniu ({enabledCount} z {configs.length}) — stuknij, aby włączyć lub wyłączyć:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {configs.map((param) => (
                  <div
                    key={param.id}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors ${
                      param.enabled
                        ? 'border-navy-800 bg-navy-900 text-white'
                        : 'border-skin-200 bg-white text-navy-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleParameter(param.id)}
                      className="min-h-[40px] flex-1 flex items-center gap-2.5 text-left touch-manipulation"
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                          param.enabled
                            ? 'bg-gold-500 border-gold-500 text-white'
                            : 'border-skin-300 bg-skin-50'
                        }`}
                      >
                        {param.enabled && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-sans font-medium truncate">
                          {param.name}
                        </span>
                        <span
                          className={`block text-[11px] font-sans tabular-nums ${
                            param.enabled ? 'text-navy-300' : 'text-navy-400'
                          }`}
                        >
                          {param.value}
                          {param.unit} · norma {param.optimalMin}–{param.optimalMax}
                          {param.unit}
                        </span>
                      </span>
                    </button>

                    {param.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(param.id)}
                        aria-label={`Usuń parametr ${param.name}`}
                        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg ml-1 ${
                          param.enabled
                            ? 'text-navy-300 hover:text-white'
                            : 'text-navy-400 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Live MSC Code result banner */}
          <section className="mb-8">
            <MSCCodeBadge
              code={analysis.mscCode.code}
              primaryPhenotype={analysis.mscCode.primary.phenotype}
              primaryDegree={analysis.mscCode.primary.degree}
              secondaryPhenotype={analysis.mscCode.secondary?.phenotype}
              secondaryDegree={analysis.mscCode.secondary?.degree}
              size="md"
            />
          </section>

          {/* Interactive analyzer & parameter sliders */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="font-serif text-xl sm:text-2xl text-navy-900 mb-1">
                2. Analiza i kalibracja wyświetlanych parametrów
              </h2>
              <p className="text-xs sm:text-sm text-navy-500 font-sans">
                Przesuwaj suwaki lub używaj przycisków +/- przy każdym parametrze, aby symulować i analizować stan skóry.
              </p>
            </div>

            <SkinParameterAnalyzerPanel
              analysis={analysis}
              allConfigs={configs}
              editable
              onUpdateParameter={handleUpdateParameter}
            />
          </section>

          {/* Save parameter report card */}
          <section className="bg-white rounded-2xl border border-skin-100 p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <h3 className="font-serif text-xl text-navy-900 mb-1">
                  Zapisz raport w karcie pacjenta
                </h3>
                <p className="text-xs text-navy-500 font-sans leading-relaxed">
                  Wygeneruje pełny raport zaleceń pielęgnacyjnych oraz zapisze badane parametry na osi historii.
                </p>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-navy-500 font-sans mb-1">
                    Imię pacjenta (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="np. Karolina"
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-800 bg-skin-50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 font-sans mb-1">
                    Wiek (opcjonalnie)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="np. 34"
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-800 bg-skin-50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <button
                  type="button"
                  onClick={handleSaveAnalysis}
                  disabled={saving}
                  className="w-full min-h-[48px] rounded-full bg-gold-500 text-white px-6 py-3 text-sm font-sans font-medium hover:bg-gold-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 touch-manipulation"
                >
                  <Save size={16} />
                  <span>{saving ? 'Zapisywanie…' : 'Zapisz i zobacz zalecenia'}</span>
                </button>
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-xs text-rose-600 font-sans">{saveError}</p>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Add Custom Parameter Modal / Mobile Bottom Sheet */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-950/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-skin-200 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-serif text-2xl text-navy-900">Dodaj własny parametr skóry</h3>
                <p className="text-xs text-navy-400 font-sans mt-0.5">
                  Zdefiniuj nazwę, zakres normy i powiązaną klasę MSC-MATRIX
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Zamknij"
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-navy-400 hover:text-navy-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomParameter} className="space-y-4">
              <div>
                <label className="block text-xs text-navy-600 font-sans mb-1">
                  Nazwa parametru *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="np. Poziom złuszczania naskórka"
                  className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">Kategoria</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">
                    Jednostka (skala 0–100)
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="%"
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">
                    Dolna granica normy (0–95)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={95}
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 tabular-nums focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">
                    Górna granica normy (5–100)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={customMax}
                    onChange={(e) => setCustomMax(e.target.value)}
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 tabular-nums focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">
                    Interpretacja skali
                  </label>
                  <select
                    value={customPolarity}
                    onChange={(e) => setCustomPolarity(e.target.value as ParameterPolarity)}
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                  >
                    <option value="range">Optimum w środku zakresu</option>
                    <option value="higher_better">Im wyższa wartość, tym lepiej</option>
                    <option value="lower_better">Im niższa wartość, tym lepiej</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-navy-600 font-sans mb-1">
                    Powiązany fenotyp MSC
                  </label>
                  <select
                    value={customPhenotype}
                    onChange={(e) => setCustomPhenotype(e.target.value as Phenotype)}
                    className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                  >
                    {PHENOTYPE_OPTIONS.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph} — {PHENOTYPE_LABELS[ph]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-navy-600 font-sans mb-1">
                  Zalecane składniki aktywne przy odchyleniu
                </label>
                <input
                  type="text"
                  value={customActives}
                  onChange={(e) => setCustomActives(e.target.value)}
                  className="w-full min-h-[44px] border border-skin-200 rounded-xl px-3.5 py-2 text-sm font-sans text-navy-900 bg-skin-50 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-skin-200 text-navy-700 text-sm font-sans font-medium hover:bg-skin-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-navy-800 text-white text-sm font-sans font-medium hover:bg-navy-900"
                >
                  Dodaj do badania
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

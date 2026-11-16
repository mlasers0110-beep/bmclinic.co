import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Minus,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import ParameterRadarChart from './ParameterRadarChart';
import type {
  AnalyzedSkinParameter,
  SkinParameterAnalysisResult,
  SkinParameterConfig,
} from '../types';

interface SkinParameterAnalyzerPanelProps {
  analysis: SkinParameterAnalysisResult;
  allConfigs?: SkinParameterConfig[];
  editable?: boolean;
  onUpdateParameter?: (id: string, patch: Partial<SkinParameterConfig>) => void;
}

type FilterTab = 'all' | 'deviated' | 'optimal';

const WEIGHT_OPTIONS = [0.5, 1.0, 1.5, 2.0];

function StatusIndicator({ param }: { param: AnalyzedSkinParameter }) {
  if (param.status === 'optimal') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-sans text-emerald-700">
        <CheckCircle2 size={13} className="flex-shrink-0" />
        <span>W normie</span>
      </span>
    );
  }
  if (param.status === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-sans text-rose-700 font-medium">
        <AlertTriangle size={13} className="flex-shrink-0" />
        <span>
          Odchylenie wysokie ({param.direction === 'low' ? 'poniżej' : 'powyżej'} normy o {param.deviation}
          {param.unit})
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-sans text-amber-700">
      <Info size={13} className="flex-shrink-0" />
      <span>
        Poza normą ({param.direction === 'low' ? '-' : '+'}
        {param.deviation}
        {param.unit})
      </span>
    </span>
  );
}

export default function SkinParameterAnalyzerPanel({
  analysis,
  allConfigs,
  editable = false,
  onUpdateParameter,
}: SkinParameterAnalyzerPanelProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const filteredParams = analysis.examinedParameters.filter((p) => {
    if (filter === 'deviated') return p.status !== 'optimal';
    if (filter === 'optimal') return p.status === 'optimal';
    return true;
  });

  const deviatedCount = analysis.moderateCount + analysis.criticalCount;

  return (
    <div className="space-y-6">
      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-skin-100 p-4">
          <p className="text-xs text-navy-400 font-sans mb-1">Indeks równowagi</p>
          <div className="font-serif text-3xl text-navy-900 tabular-nums leading-none">
            {analysis.balanceIndex}
            <span className="text-base text-navy-400 font-sans">/100</span>
          </div>
          <p className="text-xs text-navy-500 font-sans mt-1.5">
            {analysis.balanceIndex >= 80
              ? 'Wysoka homeostaza'
              : analysis.balanceIndex >= 60
                ? 'Wymaga wsparcia'
                : 'Wymaga interwencji'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-skin-100 p-4">
          <p className="text-xs text-navy-400 font-sans mb-1">Badane parametry</p>
          <div className="font-serif text-3xl text-navy-900 tabular-nums leading-none">
            {analysis.examinedParameters.length}
            {allConfigs && (
              <span className="text-base text-navy-400 font-sans">/{allConfigs.length}</span>
            )}
          </div>
          <p className="text-xs text-navy-500 font-sans mt-1.5">Aktywne w macierzy</p>
        </div>

        <div className="bg-white rounded-2xl border border-skin-100 p-4">
          <p className="text-xs text-navy-400 font-sans mb-1">W normie klinicznej</p>
          <div className="font-serif text-3xl text-emerald-700 tabular-nums leading-none">
            {analysis.optimalCount}
          </div>
          <p className="text-xs text-navy-500 font-sans mt-1.5">Zakres fizjologiczny</p>
        </div>

        <div className="bg-white rounded-2xl border border-skin-100 p-4">
          <p className="text-xs text-navy-400 font-sans mb-1">Wymagające korekty</p>
          <div className="font-serif text-3xl text-amber-700 tabular-nums leading-none">
            {deviatedCount}
          </div>
          <p className="text-xs text-navy-500 font-sans mt-1.5">
            {analysis.criticalCount > 0
              ? `W tym ${analysis.criticalCount} priorytetowe`
              : 'Odchylenia łagodne'}
          </p>
        </div>
      </div>

      {/* Radar visualization + Multi-parameter clinical synergies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-skin-100 p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-serif text-xl text-navy-900">Mapa biofizyczna skóry</h3>
            <p className="text-xs text-navy-400 font-sans mt-0.5">
              Porównanie wyników badanych z fizjologiczną strefą referencyjną
            </p>
          </div>
          <ParameterRadarChart
            parameters={analysis.examinedParameters}
            balanceIndex={analysis.balanceIndex}
          />
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-skin-100 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-xl text-navy-900 mb-1">
              Analiza korelacji badanych parametrów
            </h3>
            <p className="text-xs text-navy-400 font-sans mb-4">
              Automatyczna interpretacja zależności pomiędzy wyświetlanymi parametrami
            </p>

            <div className="space-y-4">
              {analysis.interactions.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-skin-100 bg-skin-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-serif text-lg text-navy-900 leading-snug">
                      {insight.title}
                    </h4>
                    <span className="text-xs font-sans text-navy-500">
                      {insight.involvedParameters.join(' · ')}
                    </span>
                  </div>
                  <p className="text-sm text-navy-600 font-sans leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-skin-100 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-500 font-sans">
            <span>
              Kod wynikowy z parametrów:{' '}
              <strong className="text-navy-900 font-medium">{analysis.mscCode.code}</strong>
            </span>
            <span className="tabular-nums">
              Średnia zgodność z normą: {analysis.balanceIndex}%
            </span>
          </div>
        </div>
      </div>

      {/* Parameter filter bar + Detailed list */}
      <div className="bg-white rounded-2xl border border-skin-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-xl text-navy-900">
              Szczegółowy profil wyświetlanych parametrów
            </h3>
            <p className="text-xs text-navy-400 font-sans mt-0.5">
              Wartości pomiarowe odniesione do norm klinicznych MSC-MATRIX
            </p>
          </div>

          {/* Interactive segmented filter buttons */}
          <div className="inline-flex items-center gap-1 p-1 bg-skin-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-sans font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              Wszystkie ({analysis.examinedParameters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('deviated')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-sans font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === 'deviated'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              Poza normą ({deviatedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('optimal')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-sans font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === 'optimal'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              W normie ({analysis.optimalCount})
            </button>
          </div>
        </div>

        {filteredParams.length === 0 ? (
          <div className="py-10 text-center text-sm text-navy-400 font-sans">
            Brak parametrów spełniających wybrane kryterium filtrowania.
          </div>
        ) : (
          <div className="divide-y divide-skin-100">
            {filteredParams.map((param) => {
              const barColor =
                param.status === 'critical'
                  ? 'bg-rose-500'
                  : param.status === 'moderate'
                    ? 'bg-amber-500'
                    : 'bg-navy-800';

              return (
                <div key={param.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 mb-2">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h4 className="font-serif text-lg text-navy-900">{param.name}</h4>
                        <span className="text-xs text-navy-400 font-sans">
                          {param.category} · norma {param.optimalMin}–{param.optimalMax}
                          {param.unit} · waga {param.weight.toFixed(1)}×
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <StatusIndicator param={param} />
                      <span className="font-serif text-2xl text-navy-900 tabular-nums">
                        {param.value}
                        <span className="text-xs font-sans text-navy-400 ml-0.5">{param.unit}</span>
                      </span>
                    </div>
                  </div>

                  {/* Normative range bar */}
                  <div className="relative h-3 rounded-full bg-skin-100 overflow-hidden mb-3">
                    {/* Optimal target window */}
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-600/40"
                      style={{
                        left: `${param.optimalMin}%`,
                        width: `${Math.max(2, param.optimalMax - param.optimalMin)}%`,
                      }}
                      title={`Norma kliniczna: ${param.optimalMin}–${param.optimalMax}${param.unit}`}
                    />
                    {/* Current value fill */}
                    <div
                      className={`h-full rounded-full transition-opacity duration-150 ${barColor}`}
                      style={{ width: `${param.value}%`, opacity: 0.85 }}
                    />
                  </div>

                  {/* Inline touch-optimized controls when editable */}
                  {editable && onUpdateParameter && (
                    <div className="bg-skin-50 rounded-xl p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateParameter(param.id, {
                              value: Math.max(0, param.value - 5),
                            })
                          }
                          aria-label={`Zmniejsz ${param.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl border border-skin-200 bg-white text-navy-700 flex items-center justify-center hover:bg-skin-100 active:scale-95 transition-transform touch-manipulation"
                        >
                          <Minus size={16} />
                        </button>

                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={param.value}
                          onChange={(e) =>
                            onUpdateParameter(param.id, {
                              value: parseInt(e.target.value, 10),
                            })
                          }
                          aria-label={param.name}
                          className="flex-1 h-2 bg-skin-200 rounded-lg accent-navy-800 cursor-pointer touch-manipulation"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateParameter(param.id, {
                              value: Math.min(100, param.value + 5),
                            })
                          }
                          aria-label={`Zwiększ ${param.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl border border-skin-200 bg-white text-navy-700 flex items-center justify-center hover:bg-skin-100 active:scale-95 transition-transform touch-manipulation"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-skin-200/70">
                        <span className="inline-flex items-center gap-1 text-xs text-navy-500 font-sans">
                          <SlidersHorizontal size={12} />
                          Waga:
                        </span>
                        <div className="inline-flex items-center gap-1">
                          {WEIGHT_OPTIONS.map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => onUpdateParameter(param.id, { weight: w })}
                              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-sans tabular-nums transition-colors ${
                                param.weight === w
                                  ? 'bg-navy-800 text-white font-medium'
                                  : 'bg-white border border-skin-200 text-navy-600 hover:bg-skin-100'
                              }`}
                            >
                              {w.toFixed(1)}×
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-navy-600 font-sans leading-relaxed mb-1">
                    {param.clinicalSummary}
                  </p>
                  <p className="text-xs text-navy-400 font-sans">
                    Kluczowe składniki celowane:{' '}
                    <span className="text-navy-600">{param.recommendedActives}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

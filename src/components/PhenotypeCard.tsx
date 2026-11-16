import type { Phenotype } from '../types';
import { PHENOTYPE_LABELS, PHENOTYPE_DESCRIPTIONS, PHENOTYPE_COLORS } from '../lib/mscMatrix';

interface PhenotypeCardProps {
  phenotype: Phenotype;
  score: number;
  maxScore: number;
  isPrimary?: boolean;
}

export default function PhenotypeCard({ phenotype, score, maxScore, isPrimary = false }: PhenotypeCardProps) {
  const colors = PHENOTYPE_COLORS[phenotype];
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${colors.bg} ${colors.border} ${isPrimary ? 'ring-2 ring-offset-1 ring-gold-400' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} mt-0.5 flex-shrink-0`} />
          <span className={`text-sm font-medium font-sans ${colors.text}`}>
            {PHENOTYPE_LABELS[phenotype]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isPrimary && (
            <span className="text-xs font-sans bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full border border-gold-200">
              Główny
            </span>
          )}
          <span className={`text-xs font-sans font-medium ${colors.text} opacity-70`}>
            {pct}%
          </span>
        </div>
      </div>

      <div className="w-full bg-white/60 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full ${colors.dot} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`text-xs font-sans leading-relaxed ${colors.text} opacity-80`}>
        {PHENOTYPE_DESCRIPTIONS[phenotype].split('.')[0]}.
      </p>
    </div>
  );
}

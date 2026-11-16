import type { Phenotype, Degree } from '../types';
import { PHENOTYPE_LABELS, DEGREE_LABELS } from '../lib/mscMatrix';

interface MSCCodeBadgeProps {
  code: string;
  primaryPhenotype: Phenotype;
  primaryDegree: Degree;
  secondaryPhenotype?: Phenotype;
  secondaryDegree?: Degree;
  size?: 'sm' | 'md' | 'lg';
}

export default function MSCCodeBadge({
  code,
  primaryPhenotype,
  primaryDegree,
  secondaryPhenotype,
  secondaryDegree,
  size = 'md',
}: MSCCodeBadgeProps) {
  const sizeClasses = {
    sm: { wrapper: 'p-4', code: 'text-2xl', label: 'text-xs', detail: 'text-xs' },
    md: { wrapper: 'p-6', code: 'text-4xl', label: 'text-sm', detail: 'text-sm' },
    lg: { wrapper: 'p-8', code: 'text-5xl md:text-6xl', label: 'text-base', detail: 'text-sm' },
  }[size];

  return (
    <div className={`bg-navy-900 rounded-2xl ${sizeClasses.wrapper} text-center relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-gold-400" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-gold-400" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-gold-400" />
      </div>

      <div className="relative">
        <p className={`${sizeClasses.label} text-navy-400 font-sans uppercase tracking-[0.2em] mb-2`}>
          Twój kod skóry
        </p>
        <div className={`font-serif ${sizeClasses.code} font-light text-white tracking-tight leading-none mb-4`}>
          {code}
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-navy-800 text-gold-300 text-xs font-sans px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            {PHENOTYPE_LABELS[primaryPhenotype]} · {DEGREE_LABELS[primaryDegree]}
          </span>
          {secondaryPhenotype && secondaryDegree && (
            <span className="inline-flex items-center gap-1.5 bg-navy-800 text-navy-300 text-xs font-sans px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-navy-400" />
              {PHENOTYPE_LABELS[secondaryPhenotype]} · {DEGREE_LABELS[secondaryDegree]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

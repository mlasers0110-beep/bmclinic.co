export type Phenotype = 'SEB' | 'XER' | 'VAS' | 'AGE' | 'OIL' | 'MIX' | 'NOR' | 'CIC' | 'REM';
export type Degree = 'G0' | 'G1' | 'G2' | 'G3';

export interface MSCCode {
  primary: { phenotype: Phenotype; degree: Degree };
  secondary?: { phenotype: Phenotype; degree: Degree };
  code: string;
}

export interface QuestionnaireAnswers {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
  severity1: string;
  severity2: string;
  patientName?: string;
  patientAge?: string;
}

export type ParameterPolarity = 'range' | 'higher_better' | 'lower_better';
export type ParameterStatus = 'optimal' | 'moderate' | 'critical';
export type ParameterDirection = 'low' | 'optimal' | 'high';

export interface SkinParameterConfig {
  id: string;
  name: string;
  shortName: string;
  category: string;
  unit: string;
  description: string;
  optimalMin: number;
  optimalMax: number;
  polarity: ParameterPolarity;
  value: number;
  weight: number; // 0.5 to 2.0
  enabled: boolean;
  isCustom?: boolean;
  linkedPhenotypes: Partial<Record<Phenotype, number>>;
  lowHint: string;
  highHint: string;
  optimalHint: string;
  recommendedActives: string;
}

export interface AnalyzedSkinParameter extends SkinParameterConfig {
  status: ParameterStatus;
  direction: ParameterDirection;
  deviation: number; // 0 = inside optimal range, >0 = points outside optimal range
  healthScore: number; // 0..100
  clinicalSummary: string;
}

export interface ParameterInteractionInsight {
  id: string;
  title: string;
  severity: 'info' | 'attention' | 'priority';
  description: string;
  involvedParameters: string[];
}

export interface SkinParameterAnalysisResult {
  examinedParameters: AnalyzedSkinParameter[];
  optimalCount: number;
  moderateCount: number;
  criticalCount: number;
  balanceIndex: number; // 0..100 weighted skin equilibrium index
  mscCode: MSCCode;
  phenotypeScores: Record<string, number>;
  interactions: ParameterInteractionInsight[];
}

export interface ParameterPreset {
  id: string;
  name: string;
  description: string;
  enabledIds: string[];
  weights?: Record<string, number>;
}

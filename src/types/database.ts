export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisRow {
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

export interface AnalysisInsert {
  patient_name?: string | null;
  patient_age?: number | null;
  msc_primary_phenotype: string;
  msc_primary_degree: string;
  msc_secondary_phenotype?: string | null;
  msc_secondary_degree?: string | null;
  msc_code: string;
  phenotype_scores: Record<string, number>;
  answers: Record<string, string>;
  recommendations: Recommendation[];
  notes?: string | null;
}

export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: AnalysisRow;
        Insert: AnalysisInsert;
        Update: Partial<AnalysisInsert>;
      };
    };
  };
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisInsert, AnalysisRow, Database } from '../types/database';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const hasValidSupabaseConfig =
  Boolean(supabaseUrl && /^https?:\/\//i.test(supabaseUrl)) &&
  Boolean(supabaseAnonKey);

const STORAGE_KEY = 'myskincode_analyses_v1';
const SHARE_TOKEN_KEY = 'myskincode_share_token_v1';

let memoryStore: AnalysisRow[] = [];
let memoryShareToken: string | null = null;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateHexToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function getShareToken(): string {
  try {
    const existing = window.localStorage.getItem(SHARE_TOKEN_KEY);
    if (existing) return existing;
    const token = generateHexToken();
    window.localStorage.setItem(SHARE_TOKEN_KEY, token);
    return token;
  } catch {
    if (!memoryShareToken) {
      memoryShareToken = generateHexToken();
    }
    return memoryShareToken;
  }
}

function readAnalyses(): AnalysisRow[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...memoryStore];
    const parsed = JSON.parse(raw) as AnalysisRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...memoryStore];
  }
}

function writeAnalyses(rows: AnalysisRow[]): void {
  memoryStore = [...rows];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore storage quota / iframe restrictions; memoryStore remains active
  }
}

export function getStoredShareToken(): string {
  return getShareToken();
}

type QueryResult<T> = { data: T; error: null | { message: string } };

class LocalAnalysesQueryBuilder implements PromiseLike<QueryResult<AnalysisRow[]>> {
  private rows: AnalysisRow[];
  private pendingUpdate: Partial<AnalysisInsert> | null = null;

  constructor(initialRows?: AnalysisRow[]) {
    this.rows = initialRows ?? readAnalyses();
  }

  select(_columns = '*') {
    void _columns;
    return this;
  }

  insert(payload: AnalysisInsert | AnalysisInsert[]) {
    const items = Array.isArray(payload) ? payload : [payload];
    const shareToken = getShareToken();
    const now = new Date().toISOString();

    const created: AnalysisRow[] = items.map((item) => ({
      id: generateUuid(),
      share_token: shareToken,
      created_at: now,
      patient_name: item.patient_name ?? null,
      patient_age: item.patient_age ?? null,
      msc_primary_phenotype: item.msc_primary_phenotype,
      msc_primary_degree: item.msc_primary_degree,
      msc_secondary_phenotype: item.msc_secondary_phenotype ?? null,
      msc_secondary_degree: item.msc_secondary_degree ?? null,
      msc_code: item.msc_code,
      phenotype_scores: item.phenotype_scores ?? {},
      answers: item.answers ?? {},
      recommendations: item.recommendations ?? [],
      notes: item.notes ?? null,
    }));

    const existing = readAnalyses();
    writeAnalyses([...existing, ...created]);
    return new LocalAnalysesQueryBuilder(created);
  }

  update(patch: Partial<AnalysisInsert>) {
    this.pendingUpdate = patch;
    return this;
  }

  eq(column: keyof AnalysisRow, value: unknown) {
    if (this.pendingUpdate) {
      const all = readAnalyses();
      const updatedRows: AnalysisRow[] = [];
      const nextAll = all.map((row) => {
        if (row[column] === value) {
          const merged: AnalysisRow = {
            ...row,
            ...this.pendingUpdate,
          } as AnalysisRow;
          updatedRows.push(merged);
          return merged;
        }
        return row;
      });
      writeAnalyses(nextAll);
      this.rows = updatedRows;
      this.pendingUpdate = null;
      return this;
    }
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }

  order(column: keyof AnalysisRow, options?: { ascending?: boolean }) {
    const asc = options?.ascending ?? true;
    this.rows = [...this.rows].sort((a, b) => {
      const av = a[column] ?? '';
      const bv = b[column] ?? '';
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return this;
  }

  maybeSingle(): Promise<QueryResult<AnalysisRow | null>> {
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }

  single(): Promise<QueryResult<AnalysisRow | null>> {
    if (this.rows.length === 0) {
      return Promise.resolve({ data: null, error: { message: 'Row not found' } });
    }
    return Promise.resolve({ data: this.rows[0], error: null });
  }

  then<TResult1 = QueryResult<AnalysisRow[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<AnalysisRow[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: null }).then(onfulfilled, onrejected);
  }
}

function createLocalSupabaseClient(): SupabaseClient<Database> {
  return {
    from: (_table: string) => {
      void _table;
      return new LocalAnalysesQueryBuilder();
    },
  } as unknown as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = hasValidSupabaseConfig
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : createLocalSupabaseClient();

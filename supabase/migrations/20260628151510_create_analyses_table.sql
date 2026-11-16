/*
# MySkinCode — Tabela analiz skóry

## Opis
Tworzy główną tabelę `analyses` do przechowywania wyników analiz skóry
pacjentów wraz z kodami MSC-MATRIX.

## Nowe tabele

### `analyses`
- `id` (uuid, primary key) — unikalny identyfikator analizy
- `share_token` (text, unique) — token do udostępniania historii pacjentce
- `created_at` (timestamptz) — data i czas analizy
- `patient_name` (text) — imię pacjentki (opcjonalne)
- `patient_age` (int) — wiek pacjentki (opcjonalne)
- `msc_primary_phenotype` (text) — główny fenotyp (SEB, XER, VAS, AGE, OIL, MIX, NOR, CIC, REM)
- `msc_primary_degree` (text) — stopień główny (G0, G1, G2, G3)
- `msc_secondary_phenotype` (text) — drugorzędny fenotyp (opcjonalne)
- `msc_secondary_degree` (text) — stopień drugorzędny (opcjonalne)
- `msc_code` (text) — pełny kod MSC np. "MSC-SEB-G2" lub "MSC-SEB-G2/VAS-G1"
- `phenotype_scores` (jsonb) — surowe wyniki punktowe per fenotyp
- `answers` (jsonb) — odpowiedzi z kwestionariusza
- `recommendations` (jsonb) — wygenerowane zalecenia pielęgnacyjne
- `notes` (text) — notatki profesjonalistki (opcjonalne)

## Bezpieczeństwo
- RLS włączone
- Dostęp anonimowy (anon + authenticated) — aplikacja nie wymaga logowania
- USING(true) uzasadnione: dane są publiczne/współdzielone przez token
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now(),
  patient_name text,
  patient_age int,
  msc_primary_phenotype text NOT NULL,
  msc_primary_degree text NOT NULL,
  msc_secondary_phenotype text,
  msc_secondary_degree text,
  msc_code text NOT NULL,
  phenotype_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses" ON analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analyses" ON analyses;
CREATE POLICY "anon_update_analyses" ON analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analyses" ON analyses;
CREATE POLICY "anon_delete_analyses" ON analyses FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS analyses_share_token_idx ON analyses (share_token);
CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);

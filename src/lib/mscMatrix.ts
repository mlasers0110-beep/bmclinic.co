import type { Phenotype, Degree, MSCCode, QuestionnaireAnswers } from '../types';
import type { Recommendation } from '../types/database';

export const PHENOTYPE_LABELS: Record<Phenotype, string> = {
  SEB: 'Łojotokowa',
  XER: 'Sucha',
  VAS: 'Naczynkowa',
  AGE: 'Dojrzała',
  OIL: 'Tłusta',
  MIX: 'Mieszana',
  NOR: 'Normalna',
  CIC: 'Z bliznami',
  REM: 'Przebudowana',
};

export const DEGREE_LABELS: Record<Degree, string> = {
  G0: 'Równowaga',
  G1: 'Powierzchowny',
  G2: 'Strukturalny',
  G3: 'Utrwalony',
};

export const PHENOTYPE_DESCRIPTIONS: Record<Phenotype, string> = {
  SEB: 'Skóra z tendencją do nadmiernego wydzielania sebum, rozszerzonymi porami i skłonnością do wyprysków. Wymaga regularnego oczyszczania i balansowania.',
  XER: 'Skóra z zaburzoną barierą hydrolipidową, uczuciem ściągania i skłonnością do łuszczenia. Wymaga intensywnego nawilżania i ochrony.',
  VAS: 'Skóra z widocznymi naczynkami i tendencją do rumienia. Wrażliwa na zmiany temperatury, wymaga łagodnej pielęgnacji wzmacniającej naczynia.',
  AGE: 'Skóra z widocznymi oznakami starzenia: zmarszczkami, utratą napięcia i objętości. Wymaga intensywnej regeneracji i wsparcia antyoksydacyjnego.',
  OIL: 'Skóra z intensywnym wydzielaniem sebum przez całą dobę, błyszcząca i skłonna do trądziku. Wymaga matowania i regulacji sebum.',
  MIX: 'Skóra o niejednorodnych właściwościach: tłusta w strefie T, sucha na policzkach. Wymaga strefowej pielęgnacji.',
  NOR: 'Skóra w dobrej równowadze — nie sucha, nie tłusta, bez wyraźnych problemów. Wymaga profilaktycznej pielęgnacji podtrzymującej.',
  CIC: 'Skóra z bliznami, przebarwieniami potrądzikowymi lub pozapalnymi. Wymaga terapii rozjaśniającej i restrukturyzującej.',
  REM: 'Skóra po zabiegach medycyny estetycznej, w fazie przebudowy. Wymaga pielęgnacji wspierającej remodeling i ochronnej.',
};

export const PHENOTYPE_COLORS: Record<Phenotype, { bg: string; border: string; text: string; dot: string }> = {
  SEB: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-400' },
  XER: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-400' },
  VAS: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', dot: 'bg-rose-400' },
  AGE: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-400' },
  OIL: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-400' },
  MIX: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-400' },
  NOR: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', dot: 'bg-sky-400' },
  CIC: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-400' },
  REM: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-400' },
};

// Scoring map: each answer key maps to phenotype score increments
type ScoreMap = Partial<Record<Phenotype, number>>;

const Q1_SCORES: Record<string, ScoreMap> = {
  a: { OIL: 3, SEB: 2 },
  b: { MIX: 3, NOR: 1 },
  c: { XER: 3 },
  d: { NOR: 3 },
};

const Q2_SCORES: Record<string, ScoreMap> = {
  a: { SEB: 3, OIL: 2 },
  b: { MIX: 3, SEB: 1 },
  c: { XER: 2, NOR: 2 },
  d: { CIC: 3 },
};

const Q3_SCORES: Record<string, ScoreMap> = {
  a: { VAS: 3 },
  b: { SEB: 2, OIL: 2 },
  c: { XER: 2 },
  d: { NOR: 2 },
};

const Q4_SCORES: Record<string, ScoreMap> = {
  a: { NOR: 1, OIL: 1 },
  b: { AGE: 2, MIX: 1 },
  c: { AGE: 3 },
  d: { REM: 3 },
};

const Q5_SCORES: Record<string, ScoreMap> = {
  a: { SEB: 3, OIL: 3 },
  b: { XER: 3 },
  c: { VAS: 3 },
  d: { AGE: 3 },
};

const Q6_SCORES: Record<string, ScoreMap> = {
  a: { VAS: 2, XER: 1 },
  b: { SEB: 2 },
  c: { NOR: 2, MIX: 1 },
  d: { VAS: 3 },
};

const Q7_SCORES: Record<string, ScoreMap> = {
  a: { CIC: 3, SEB: 1 },
  b: { AGE: 2 },
  c: { VAS: 3 },
  d: { NOR: 2 },
};

const Q8_SCORES: Record<string, ScoreMap> = {
  a: { REM: 3 },
  b: { REM: 2 },
  c: { NOR: 1 },
  d: { NOR: 1 },
};

const SEVERITY_DEGREE: Record<string, Partial<Record<Degree, number>>> = {
  s1a: { G1: 1 },
  s1b: { G1: 2, G2: 1 },
  s1c: { G2: 2, G3: 1 },
  s1d: { G3: 3 },
};

const SEVERITY_DURATION: Record<string, Partial<Record<Degree, number>>> = {
  s2a: { G1: 1 },
  s2b: { G1: 1, G2: 1 },
  s2c: { G2: 2 },
  s2d: { G3: 2 },
};

export function computeMSCCode(answers: QuestionnaireAnswers): {
  mscCode: MSCCode;
  phenotypeScores: Record<string, number>;
} {
  const scores: Record<string, number> = {};
  const allPhenotypes: Phenotype[] = ['SEB', 'XER', 'VAS', 'AGE', 'OIL', 'MIX', 'NOR', 'CIC', 'REM'];
  allPhenotypes.forEach((p) => (scores[p] = 0));

  const addScores = (map: ScoreMap) => {
    for (const [phenotype, pts] of Object.entries(map)) {
      scores[phenotype] = (scores[phenotype] ?? 0) + (pts ?? 0);
    }
  };

  if (answers.q1 && Q1_SCORES[answers.q1]) addScores(Q1_SCORES[answers.q1]);
  if (answers.q2 && Q2_SCORES[answers.q2]) addScores(Q2_SCORES[answers.q2]);
  if (answers.q3 && Q3_SCORES[answers.q3]) addScores(Q3_SCORES[answers.q3]);
  if (answers.q4 && Q4_SCORES[answers.q4]) addScores(Q4_SCORES[answers.q4]);
  if (answers.q5 && Q5_SCORES[answers.q5]) addScores(Q5_SCORES[answers.q5]);
  if (answers.q6 && Q6_SCORES[answers.q6]) addScores(Q6_SCORES[answers.q6]);
  if (answers.q7 && Q7_SCORES[answers.q7]) addScores(Q7_SCORES[answers.q7]);
  if (answers.q8 && Q8_SCORES[answers.q8]) addScores(Q8_SCORES[answers.q8]);

  const sorted = allPhenotypes.slice().sort((a, b) => scores[b] - scores[a]);
  const primaryPhenotype = sorted[0] as Phenotype;
  const secondaryPhenotype = scores[sorted[1]] >= 3 ? (sorted[1] as Phenotype) : undefined;

  // Determine degree from severity answers
  const degreeScores: Record<string, number> = { G0: 0, G1: 0, G2: 0, G3: 0 };
  const s1Key = `s1${answers.severity1}`;
  const s2Key = `s2${answers.severity2}`;

  if (SEVERITY_DEGREE[s1Key]) {
    for (const [d, pts] of Object.entries(SEVERITY_DEGREE[s1Key])) {
      degreeScores[d] += pts ?? 0;
    }
  }
  if (SEVERITY_DURATION[s2Key]) {
    for (const [d, pts] of Object.entries(SEVERITY_DURATION[s2Key])) {
      degreeScores[d] += pts ?? 0;
    }
  }

  let primaryDegree: Degree = 'G1';
  if (primaryPhenotype === 'NOR' || primaryPhenotype === 'REM') {
    const hasActiveSymptoms = ['G2', 'G3'].some((d) => degreeScores[d] > 0);
    primaryDegree = hasActiveSymptoms ? 'G1' : 'G0';
  } else {
    const topDegree = (Object.entries(degreeScores) as [Degree, number][])
      .sort((a, b) => b[1] - a[1])[0];
    primaryDegree = topDegree[1] > 0 ? topDegree[0] : 'G1';
  }

  const secondaryDegree: Degree = primaryDegree === 'G0' ? 'G1' : primaryDegree === 'G3' ? 'G2' : primaryDegree;

  const primaryCode = `MSC-${primaryPhenotype}-${primaryDegree}`;
  const code = secondaryPhenotype
    ? `${primaryCode}/${secondaryPhenotype}-${secondaryDegree}`
    : primaryCode;

  return {
    mscCode: {
      primary: { phenotype: primaryPhenotype, degree: primaryDegree },
      secondary: secondaryPhenotype
        ? { phenotype: secondaryPhenotype, degree: secondaryDegree }
        : undefined,
      code,
    },
    phenotypeScores: scores,
  };
}

export function generateRecommendations(phenotype: Phenotype, degree: Degree): Recommendation[] {
  const base: Record<Phenotype, Recommendation[]> = {
    SEB: [
      { category: 'Oczyszczanie', title: 'Żel enzymatyczny lub kwasowy', description: 'Stosuj żel z kwasem salicylowym 1–2% rano i wieczorem. Unikaj mydeł alkalicznych naruszających barierę skóry.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Lekki fluid matujący', description: 'Wybierz fluid z niacynamidem 5% i zieloną herbatą. Unikaj tłustych kremów okluzyjnych.', priority: 'high' },
      { category: 'Zabiegi', title: 'Peeling kwasowy (BHA)', description: 'Peelingi z kwasem salicylowym lub azelainowym 1–2× w tygodniu dla redukcji zaskórników.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'Filtr matujący SPF50+', description: 'Codzienny fluid SPF 50+ z filtrem mineralnym lub hybrydowym. Matujące pudry z SPF jako poprawka.', priority: 'high' },
    ],
    XER: [
      { category: 'Oczyszczanie', title: 'Mleczko lub olejek micelarny', description: 'Delikatne mleczko lub olejek do demakijażu bez SLS. Unikaj gorącej wody — myj chłodną/letnią.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Bogaty krem z ceramidami', description: 'Krem z ceramidami, masłem shea i kwasem hialuronowym — stosuj na wilgotną skórę, by zatrzymać wodę.', priority: 'high' },
      { category: 'Kuracja', title: 'Olejki squalane lub jojoba', description: 'Wieczorem dokładaj kilka kropel olejku squalane pod krem lub jako ostatnią warstwę pielęgnacji.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'Filtr mineralny z nawilżeniem', description: 'SPF 50+ w kremowej formule z filtrem mineralnym — filtr matujący będzie zbyt wysuszający.', priority: 'high' },
    ],
    VAS: [
      { category: 'Oczyszczanie', title: 'Mleczko termalne lub Micelara', description: 'Tylko produkty dla skóry naczynkowej, bez alkoholu i ostrych substancji. Woda termalna do spłukiwania.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Krem wzmacniający naczynia', description: 'Produkty z witaminą C, ruscusem, diosminem lub wyciągiem z kasztanowca — wzmacniają ścianki naczyń.', priority: 'high' },
      { category: 'Zabiegi', title: 'IPL lub laser naczyniowy', description: 'Zabiegi laserowe (IPL, Nd:YAG, laser 532nm) skutecznie zamykają rozszerzone naczynka.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'Filtr mineralny tlenek cynku', description: 'SPF 50+ z tlenkiem cynku — chroni i łagodzi, nie podrażnia. Unikaj opalania i saun.', priority: 'high' },
    ],
    AGE: [
      { category: 'Aktywne składniki', title: 'Retinol 0,1–0,5% na noc', description: 'Retinol lub bakuchiol (wersja łagodna) przyspieszają obrót komórkowy i stymulują kolagen.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Krem liftingujący z peptydami', description: 'Peptydy sygnałowe (Matrixyl, Argireline) + ceramidy + skwalan — stosuj rano i wieczorem.', priority: 'high' },
      { category: 'Zabiegi', title: 'Mezoterapia lub RF Microneedling', description: 'Zabiegi biostymulujące kolagen: HIFU, RF, kwas hialuronowy — konsultacja z dermatologiem.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'SPF 50+ z antyoksydantami', description: 'Filtr SPF 50+ z witaminą C i E jako ochrona antyoksydacyjna przed fotostarzeniem — codziennie.', priority: 'high' },
    ],
    OIL: [
      { category: 'Oczyszczanie', title: 'Podwójne oczyszczanie', description: 'Olejek na bazie jojoba jako pierwsze oczyszczanie (usuwa sebum), następnie żel kwasowy.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Żelowy fluid z niacynamidem', description: 'Fluid żelowy, bezolejowy z niacynamidem 10% i cynkiem reguluje sebum bez zapychania porów.', priority: 'high' },
      { category: 'Zabiegi', title: 'Peelingi i fotomaski', description: 'Maski z glinką 2–3× w tygodniu. Peeling chemiczny BHA 1× w tygodniu po adaptacji skóry.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'Fluid SPF50+ oil-free', description: 'Lekki fluid SPF 50+ z filtrem chemicznym lub mineralnym w formule oil-free.', priority: 'high' },
    ],
    MIX: [
      { category: 'Oczyszczanie', title: 'Żel enzymatyczny', description: 'Delikatny żel oczyszczający dla skóry mieszanej — reguluje strefę T bez przesuszania policzków.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Strefowa pielęgnacja', description: 'Lekki fluid na całą twarz, lokalnie: matujący żel na strefę T, bogatszy krem na policzki.', priority: 'high' },
      { category: 'Zabiegi', title: 'Maseczki strefowe', description: 'Maska z glinką na strefę T + nawilżająca maska na policzki — jednocześnie raz w tygodniu.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'Fluid SPF50+', description: 'Lekki fluid SPF 50+ bez filtrów wosków — równomierny na całej twarzy.', priority: 'high' },
    ],
    NOR: [
      { category: 'Oczyszczanie', title: 'Łagodna pianka lub mleczko', description: 'Delikatna pianka lub mleczko oczyszczające bez SLS. Oczyszczaj rano i wieczorem.', priority: 'medium' },
      { category: 'Nawilżanie', title: 'Lekki krem nawilżający SPF', description: 'Krem nawilżający z SPF 30+ na dzień — wystarczy jedna warstwa pielęgnacji dla tej skóry.', priority: 'medium' },
      { category: 'Prewencja', title: 'Antyoksydanty i SPF', description: 'Serum z witaminą C 10% rano. Profilaktyka przed fotostarzeniem — to inwestycja na przyszłość.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'SPF 30–50+ codziennie', description: 'Codzienny filtr SPF 30–50+ to jedyny nawyk, który przedłuży zdrowy wygląd skóry o dekadę.', priority: 'high' },
    ],
    CIC: [
      { category: 'Rozjaśnianie', title: 'Kwas azelainowy 10–20%', description: 'Kwas azelainowy lub niacynamid 10% na przebarwienia potrądzikowe — stosuj wieczorem.', priority: 'high' },
      { category: 'Restrukturyzacja', title: 'Retinol + witamina C', description: 'Retinol 0,05% na noc i witamina C 15% rano dla spłycenia blizn i wyrównania kolorytu.', priority: 'high' },
      { category: 'Zabiegi', title: 'Microneedling lub laser frakcyjny', description: 'Laser CO2 frakcyjny, microneedling RF lub dermapen — konsultacja z dermatologiem estetycznym.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'SPF 50+ obowiązkowo', description: 'Przebarwienia pogłębia każde nasłonecznienie — SPF 50+ codziennie, bez wyjątku.', priority: 'high' },
    ],
    REM: [
      { category: 'Ochrona bariery', title: 'Ceramidy i pantenol', description: 'Po zabiegach skóra potrzebuje odbudowy bariery: ceramidy, pantenol, aloes. Unikaj kwasów przez 2 tygodnie.', priority: 'high' },
      { category: 'Nawilżanie', title: 'Intensywne nawilżanie post-zabiegowe', description: 'Produkty specjalnie dla skóry po zabiegach: La Roche-Posay Cicaplast, Avène Cicalfate lub equiv.', priority: 'high' },
      { category: 'Reintrodukcja', title: 'Stopniowe wprowadzanie aktywnych', description: 'Po 4–6 tygodniach stopniowo wróć do aktywnych składników (retinol, kwasy) — zaczynaj od niskich stężeń.', priority: 'medium' },
      { category: 'Ochrona słoneczna', title: 'SPF 50+ przez cały czas', description: 'Skóra w przebudowie jest ekstremalnie wrażliwa na UV. SPF 50+ mineralny, łagodzący — bezwzględnie.', priority: 'high' },
    ],
  };

  const recs = base[phenotype] ?? base['NOR'];

  if (degree === 'G3') {
    return [
      ...recs,
      {
        category: 'Konsultacja',
        title: 'Wizyta u dermatologa',
        description: 'Przy utrwalonych zmianach (G3) zalecamy konsultację z dermatologiem lub specjalistą medycyny estetycznej w celu ustalenia indywidualnego planu leczenia.',
        priority: 'high',
      },
    ];
  }

  return recs;
}

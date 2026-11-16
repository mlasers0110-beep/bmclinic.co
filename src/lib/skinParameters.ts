import type {
  AnalyzedSkinParameter,
  Degree,
  MSCCode,
  ParameterDirection,
  ParameterInteractionInsight,
  ParameterPreset,
  ParameterStatus,
  Phenotype,
  QuestionnaireAnswers,
  SkinParameterAnalysisResult,
  SkinParameterConfig,
} from '../types';
import type { Recommendation } from '../types/database';
import { generateRecommendations } from './mscMatrix';

const PARAM_CONFIG_STORAGE_KEY = 'myskincode_param_configs_v1';

export const DEFAULT_SKIN_PARAMETERS: SkinParameterConfig[] = [
  {
    id: 'sebum',
    name: 'Wydzielanie sebum',
    shortName: 'Sebum',
    category: 'Gospodarka lipidowa',
    unit: '%',
    description: 'Aktywność gruczołów łojowych oraz poziom lipidów powierzchniowych w strefie T i na policzkach.',
    optimalMin: 25,
    optimalMax: 45,
    polarity: 'range',
    value: 38,
    weight: 1.0,
    enabled: true,
    linkedPhenotypes: { OIL: 3, SEB: 3, MIX: 2 },
    lowHint: 'Niedobór lipidów powierzchniowych sprzyja przesuszeniu i ściągnięciu naskórka.',
    highHint: 'Nadprodukcja łoju zwiększa błyszczenie, ryzyko komedogenezy i zmian łojotokowych.',
    optimalHint: 'Fizjologiczny płaszcz lipidowy wspiera elastyczność i ochronę naskórka.',
    recommendedActives: 'Niacynamid 5–10%, kwas salicylowy (BHA), cynk PCA, glinka biała',
  },
  {
    id: 'hydration',
    name: 'Nawilżenie warstwy rogowej',
    shortName: 'Nawilżenie',
    category: 'Bilans wodny',
    unit: '%',
    description: 'Stopień uwodnienia korneocytów (odpowiednik pomiaru korneometrycznego naskórka).',
    optimalMin: 55,
    optimalMax: 85,
    polarity: 'higher_better',
    value: 62,
    weight: 1.2,
    enabled: true,
    linkedPhenotypes: { XER: 3, MIX: 1 },
    lowHint: 'Obniżone uwodnienie powoduje szorstkość, uczucie ściągania i drobne linie dehydratacyjne.',
    highHint: 'Wysokie uwodnienie naskórka — należy kontrolować równowagę okluzji, by uniknąć maceracji.',
    optimalHint: 'Prawidłowe uwodnienie warstwy rogowej zapewnia miękkość i gładkość skóry.',
    recommendedActives: 'Kwas hialuronowy wielocząsteczkowy, trehaloza, kwas poliglutaminowy, betaina',
  },
  {
    id: 'barrier',
    name: 'Szczelność bariery (TEWL)',
    shortName: 'Bariera',
    category: 'Ochrona naskórkowa',
    unit: 'pkt',
    description: 'Integralność cementu międzykomórkowego i odporność na przeznaskórkową utratę wody.',
    optimalMin: 65,
    optimalMax: 95,
    polarity: 'higher_better',
    value: 70,
    weight: 1.2,
    enabled: true,
    linkedPhenotypes: { XER: 3, VAS: 2, REM: 2 },
    lowHint: 'Osłabiona bariera hydrolipidowa nasila ucieczkę wody, pieczenie i nadreaktywność na kosmetyki.',
    highHint: 'Wysoka szczelność bariery naskórkowej zapewnia pełną odporność na czynniki zewnętrzne.',
    optimalHint: 'Sprawny cement międzykomórkowy skutecznie ogranicza przeznaskórkową utratę wody (TEWL).',
    recommendedActives: 'Ceramidy NP/AP/EOP, cholesterol, wolne kwasy tłuszczowe, skwalan, pantenol',
  },
  {
    id: 'vascular',
    name: 'Reaktywność naczyniowa i rumień',
    shortName: 'Naczynia',
    category: 'Mikrokrążenie',
    unit: '%',
    description: 'Skłonność do rumienia napadowego lub utrwalonego, teleangiektazji oraz pieczenia termicznego.',
    optimalMin: 0,
    optimalMax: 25,
    polarity: 'lower_better',
    value: 20,
    weight: 1.0,
    enabled: true,
    linkedPhenotypes: { VAS: 4 },
    lowHint: 'Niska reaktywność naczyniowa — mikrokrążenie skóry pozostaje stabilne.',
    highHint: 'Wzmożona gra naczyniowa i rumień wymagają wyciszenia stanu zapalnego oraz fotoprotekcji mineralnej.',
    optimalHint: 'Prawidłowa odporność naczyń włosowatych na stres i wahania temperatury.',
    recommendedActives: 'Kwas azelainowy, trokserutyna, ruszczyk, wąkrota azjatycka (CICA), tlenek cynku',
  },
  {
    id: 'elasticity',
    name: 'Elastyczność i gęstość skóry',
    shortName: 'Jędrność',
    category: 'Biomechanika',
    unit: '%',
    description: 'Sprężystość włókien kolagenowo-elastynowych, napięcie owalu twarzy oraz odporność na zmarszczki.',
    optimalMin: 65,
    optimalMax: 95,
    polarity: 'higher_better',
    value: 72,
    weight: 1.0,
    enabled: true,
    linkedPhenotypes: { AGE: 4 },
    lowHint: 'Spadek gęstości macierzy zewnątrzkomórkowej sprzyja wiotkości i utrwalaniu zmarszczek.',
    highHint: 'Wysoka sprężystość biomechaniczna i prawidłowe napięcie strukturalne skóry.',
    optimalHint: 'Dobra integralność kolagenu i elastyny utrzymuje prawidłowy tonus skóry.',
    recommendedActives: 'Retinoidy (retinol/retinal), peptydy sygnałowe, witamina C, bakuchiol',
  },
  {
    id: 'pores_texture',
    name: 'Tekstura i widoczność porów',
    shortName: 'Pory / tekstura',
    category: 'Struktura powierzchni',
    unit: '%',
    description: 'Stopień rozszerzenia ujść gruczołów łojowych, obecność zaskórników i nierówności naskórka.',
    optimalMin: 0,
    optimalMax: 30,
    polarity: 'lower_better',
    value: 26,
    weight: 1.0,
    enabled: true,
    linkedPhenotypes: { SEB: 3, MIX: 2, OIL: 2, CIC: 1 },
    lowHint: 'Gładka struktura naskórka z mało widocznymi ujściami gruczołów łojowych.',
    highHint: 'Poszerzone pory i nierówna tekstura wymagają regulacji keratynizacji i oczyszczania ujść.',
    optimalHint: 'Równomierna rzeźba powierzchniowa skóry bez zastojów łojowo-rogowych.',
    recommendedActives: 'Kwas salicylowy 1–2%, PHA (glukonolakton), niacynamid, enzymy proteolityczne',
  },
  {
    id: 'pigmentation_scars',
    name: 'Przebarwienia i blizny (PIH)',
    shortName: 'Koloryt / blizny',
    category: 'Melanogeneza i blizny',
    unit: '%',
    description: 'Nasilenie przebarwień pozapalnych, plam soczewicowatych oraz ubytków lub blizn potrądzikowych.',
    optimalMin: 0,
    optimalMax: 20,
    polarity: 'lower_better',
    value: 16,
    weight: 1.0,
    enabled: true,
    linkedPhenotypes: { CIC: 4, AGE: 1 },
    lowHint: 'Jednolity koloryt bez utrwalonych zmian pozapalnych i blizn.',
    highHint: 'Nierównomierna dystrybucja melaniny lub blizny wymagają inhibitorów tyrozynazy i rygorystycznego SPF 50+.',
    optimalHint: 'Spokojna melanogeneza i równomierny ton cery.',
    recommendedActives: 'Kwas traneksamowy, kwas azelainowy 15%, witamina C, alfa-arbutyna, SPF 50+',
  },
  {
    id: 'remodeling',
    name: 'Indeks przebudowy pozabiegowej',
    shortName: 'Przebudowa',
    category: 'Regeneracja',
    unit: '%',
    description: 'Intensywność procesów naprawczych po zabiegach laserowych, iniekcyjnych lub peelingach medycznych.',
    optimalMin: 0,
    optimalMax: 20,
    polarity: 'lower_better',
    value: 10,
    weight: 0.8,
    enabled: true,
    linkedPhenotypes: { REM: 4 },
    lowHint: 'Skóra nie znajduje się aktualnie w fazie rekonwalescencji pozabiegowej.',
    highHint: 'Aktywna faza przebudowy tkankowej — priorytetem jest regeneracja barierowa i ścisła fotoprotekcja.',
    optimalHint: 'Fizjologiczny rytm odnowy komórkowej bez przeciążenia pozabiegowego.',
    recommendedActives: ' Madekasozyd, pantenol 5%, ceramidy, alantoina, filtry mineralne SPF 50+',
  },
];

export const PARAMETER_PRESETS: ParameterPreset[] = [
  {
    id: 'full_clinical',
    name: 'Pełny panel kliniczny (8)',
    description: 'Kompleksowa ocena wszystkich 8 parametrów biofizycznych MSC-MATRIX.',
    enabledIds: [
      'sebum',
      'hydration',
      'barrier',
      'vascular',
      'elasticity',
      'pores_texture',
      'pigmentation_scars',
      'remodeling',
    ],
    weights: {
      sebum: 1.0,
      hydration: 1.2,
      barrier: 1.2,
      vascular: 1.0,
      elasticity: 1.0,
      pores_texture: 1.0,
      pigmentation_scars: 1.0,
      remodeling: 0.8,
    },
  },
  {
    id: 'sebo_acne',
    name: 'Panel łojotokowo-porowy',
    description: 'Ukierunkowany na sebum, pory, przebarwienia pozapalne oraz nawilżenie.',
    enabledIds: ['sebum', 'hydration', 'barrier', 'pores_texture', 'pigmentation_scars'],
    weights: {
      sebum: 1.6,
      pores_texture: 1.5,
      pigmentation_scars: 1.3,
      hydration: 1.2,
      barrier: 1.0,
    },
  },
  {
    id: 'barrier_vascular',
    name: 'Panel bariery i naczyń',
    description: 'Dla cery wrażliwej, suchej, z rumieniem, teleangiektazjami lub nietolerancją kosmetyków.',
    enabledIds: ['hydration', 'barrier', 'vascular', 'remodeling'],
    weights: {
      vascular: 1.8,
      barrier: 1.6,
      hydration: 1.4,
      remodeling: 1.0,
    },
  },
  {
    id: 'anti_aging_remodel',
    name: 'Panel anti-aging i przebudowy',
    description: 'Skupiony na gęstości kolagenu, fotostarzeniu, kolorycie i regeneracji po zabiegach.',
    enabledIds: ['elasticity', 'hydration', 'barrier', 'pigmentation_scars', 'remodeling'],
    weights: {
      elasticity: 1.8,
      pigmentation_scars: 1.3,
      remodeling: 1.4,
      hydration: 1.2,
      barrier: 1.2,
    },
  },
];

let memoryConfigs: SkinParameterConfig[] | null = null;

export function cloneDefaultParameters(): SkinParameterConfig[] {
  return DEFAULT_SKIN_PARAMETERS.map((p) => ({
    ...p,
    linkedPhenotypes: { ...p.linkedPhenotypes },
  }));
}

export function loadParameterConfigs(): SkinParameterConfig[] {
  try {
    const raw = window.localStorage.getItem(PARAM_CONFIG_STORAGE_KEY);
    if (!raw) return memoryConfigs ? memoryConfigs.map((c) => ({ ...c })) : cloneDefaultParameters();
    const parsed = JSON.parse(raw) as SkinParameterConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return cloneDefaultParameters();
    return parsed;
  } catch {
    return memoryConfigs ? memoryConfigs.map((c) => ({ ...c })) : cloneDefaultParameters();
  }
}

export function saveParameterConfigs(configs: SkinParameterConfig[]): void {
  memoryConfigs = configs.map((c) => ({ ...c }));
  try {
    window.localStorage.setItem(PARAM_CONFIG_STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // Fallback to in-memory config when storage is restricted
  }
}

export function resetParameterConfigs(): SkinParameterConfig[] {
  const defaults = cloneDefaultParameters();
  saveParameterConfigs(defaults);
  return defaults;
}

export function applyParameterPreset(
  current: SkinParameterConfig[],
  preset: ParameterPreset
): SkinParameterConfig[] {
  const updated = current.map((param) => {
    const enabled = preset.enabledIds.includes(param.id);
    const weight = preset.weights?.[param.id] ?? param.weight;
    return { ...param, enabled, weight };
  });
  saveParameterConfigs(updated);
  return updated;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

export function deriveParameterValuesFromAnswers(
  answers: Partial<QuestionnaireAnswers>,
  existingConfigs?: SkinParameterConfig[]
): SkinParameterConfig[] {
  const base = existingConfigs ? existingConfigs.map((c) => ({ ...c })) : loadParameterConfigs();

  let sebum = 35;
  let hydration = 68;
  let barrier = 72;
  let vascular = 15;
  let elasticity = 78;
  let pores = 22;
  let scars = 12;
  let remodeling = 8;

  // Q1: post-cleansing feel
  if (answers.q1 === 'a') { sebum += 38; hydration -= 6; pores += 18; }
  if (answers.q1 === 'b') { sebum += 18; pores += 12; }
  if (answers.q1 === 'c') { sebum -= 18; hydration -= 26; barrier -= 22; }
  if (answers.q1 === 'd') { hydration += 8; barrier += 8; }

  // Q2: pores / comedones / scars
  if (answers.q2 === 'a') { pores += 42; sebum += 18; }
  if (answers.q2 === 'b') { pores += 22; sebum += 8; }
  if (answers.q2 === 'c') { pores -= 8; hydration -= 8; }
  if (answers.q2 === 'd') { scars += 42; pores += 14; }

  // Q3: stress / temperature reaction
  if (answers.q3 === 'a') { vascular += 38; barrier -= 14; }
  if (answers.q3 === 'b') { sebum += 14; pores += 14; }
  if (answers.q3 === 'c') { hydration -= 18; barrier -= 18; }
  if (answers.q3 === 'd') { barrier += 6; }

  // Q4: skin maturity / aesthetic procedures
  if (answers.q4 === 'a') { elasticity += 10; }
  if (answers.q4 === 'b') { elasticity -= 18; }
  if (answers.q4 === 'c') { elasticity -= 38; hydration -= 10; }
  if (answers.q4 === 'd') { remodeling += 42; barrier -= 10; }

  // Q5: main concern
  if (answers.q5 === 'a') { sebum += 18; pores += 18; }
  if (answers.q5 === 'b') { hydration -= 20; barrier -= 18; sebum -= 8; }
  if (answers.q5 === 'c') { vascular += 32; }
  if (answers.q5 === 'd') { elasticity -= 24; scars += 10; }

  // Q6: reaction to new cosmetics
  if (answers.q6 === 'a') { barrier -= 22; vascular += 16; }
  if (answers.q6 === 'b') { pores += 14; sebum += 8; }
  if (answers.q6 === 'c') { barrier += 8; }
  if (answers.q6 === 'd') { vascular += 28; barrier -= 16; }

  // Q7: skin tone uniformity
  if (answers.q7 === 'a') { scars += 36; }
  if (answers.q7 === 'b') { scars += 24; elasticity -= 10; }
  if (answers.q7 === 'c') { vascular += 24; }
  if (answers.q7 === 'd') { scars = Math.min(scars, 14); }

  // Q8: aesthetic procedures in last year
  if (answers.q8 === 'a') { remodeling += 46; barrier -= 8; }
  if (answers.q8 === 'b') { remodeling += 28; }
  if (answers.q8 === 'c') { remodeling += 12; }

  // Severity & duration amplification
  const sevMultiplier =
    answers.severity1 === 'd' ? 1.22 :
    answers.severity1 === 'c' ? 1.12 :
    answers.severity1 === 'a' ? 0.88 : 1.0;

  const amplifyHigh = (val: number, baseline: number) =>
    val > baseline ? baseline + (val - baseline) * sevMultiplier : val;
  const amplifyLow = (val: number, baseline: number) =>
    val < baseline ? baseline - (baseline - val) * sevMultiplier : val;

  const computedMap: Record<string, number> = {
    sebum: clamp(amplifyHigh(amplifyLow(sebum, 35), 35), 5, 96),
    hydration: clamp(amplifyLow(hydration, 68), 12, 95),
    barrier: clamp(amplifyLow(barrier, 72), 15, 96),
    vascular: clamp(amplifyHigh(vascular, 15), 4, 96),
    elasticity: clamp(amplifyLow(elasticity, 78), 18, 96),
    pores_texture: clamp(amplifyHigh(pores, 22), 5, 96),
    pigmentation_scars: clamp(amplifyHigh(scars, 12), 4, 96),
    remodeling: clamp(amplifyHigh(remodeling, 8), 0, 95),
  };

  return base.map((param) => ({
    ...param,
    value: computedMap[param.id] !== undefined ? computedMap[param.id] : param.value,
  }));
}

export function evaluateSingleParameter(param: SkinParameterConfig): AnalyzedSkinParameter {
  const { value, optimalMin, optimalMax, polarity } = param;
  let direction: ParameterDirection = 'optimal';
  let deviation = 0;

  if (polarity === 'higher_better') {
    if (value < optimalMin) {
      direction = 'low';
      deviation = optimalMin - value;
    } else if (value > optimalMax) {
      direction = 'optimal';
      deviation = 0;
    }
  } else if (polarity === 'lower_better') {
    if (value > optimalMax) {
      direction = 'high';
      deviation = value - optimalMax;
    } else if (value < optimalMin) {
      direction = 'optimal';
      deviation = 0;
    }
  } else {
    if (value < optimalMin) {
      direction = 'low';
      deviation = optimalMin - value;
    } else if (value > optimalMax) {
      direction = 'high';
      deviation = value - optimalMax;
    }
  }

  let status: ParameterStatus = 'optimal';
  if (deviation > 20) {
    status = 'critical';
  } else if (deviation > 0) {
    status = 'moderate';
  }

  const healthScore = clamp(100 - deviation * 1.75, 8, 100);
  const clinicalSummary =
    direction === 'low'
      ? param.lowHint
      : direction === 'high'
        ? param.highHint
        : param.optimalHint;

  return {
    ...param,
    status,
    direction,
    deviation,
    healthScore,
    clinicalSummary,
  };
}

export function analyzeSkinParameters(configs: SkinParameterConfig[]): SkinParameterAnalysisResult {
  const active = configs.filter((c) => c.enabled);
  const fallbackList = active.length > 0 ? active : configs.slice(0, 1);
  const examinedParameters = fallbackList.map(evaluateSingleParameter);

  const optimalCount = examinedParameters.filter((p) => p.status === 'optimal').length;
  const moderateCount = examinedParameters.filter((p) => p.status === 'moderate').length;
  const criticalCount = examinedParameters.filter((p) => p.status === 'critical').length;

  const totalWeight = examinedParameters.reduce((acc, p) => acc + p.weight, 0) || 1;
  const weightedHealth = examinedParameters.reduce(
    (acc, p) => acc + p.healthScore * p.weight,
    0
  );
  const balanceIndex = clamp(weightedHealth / totalWeight, 0, 100);

  // Compute phenotype scores from active parameters and their clinical deviations
  const allPhenotypes: Phenotype[] = ['SEB', 'XER', 'VAS', 'AGE', 'OIL', 'MIX', 'NOR', 'CIC', 'REM'];
  const scores: Record<string, number> = {};
  allPhenotypes.forEach((ph) => {
    scores[ph] = 0;
  });

  const byId = new Map<string, AnalyzedSkinParameter>();
  examinedParameters.forEach((p) => byId.set(p.id, p));

  for (const param of examinedParameters) {
    if (param.deviation > 0) {
      const intensity = (param.deviation / 15) * param.weight;
      // Special handling for sebum low -> XER vs sebum high -> OIL/SEB
      if (param.id === 'sebum' && param.direction === 'low') {
        scores.XER += Math.round(intensity * 3 * 10) / 10;
        continue;
      }
      for (const [ph, factor] of Object.entries(param.linkedPhenotypes)) {
        scores[ph] = (scores[ph] ?? 0) + intensity * (factor ?? 1);
      }
    } else {
      scores.NOR += 1.6 * param.weight;
    }
  }

  // Detect MIX synergy: elevated sebum/pores + reduced hydration/barrier
  const sebumP = byId.get('sebum');
  const hydP = byId.get('hydration');
  const poresP = byId.get('pores_texture');
  if (
    sebumP &&
    hydP &&
    sebumP.value >= 46 &&
    sebumP.value <= 72 &&
    hydP.value < 58
  ) {
    scores.MIX += 4.5 * ((sebumP.weight + hydP.weight) / 2);
  }
  if (sebumP && sebumP.value > 72) {
    scores.OIL += 3.2 * sebumP.weight;
  }
  if (sebumP && poresP && sebumP.value > 52 && poresP.value > 42) {
    scores.SEB += 3.4 * ((sebumP.weight + poresP.weight) / 2);
  }

  // Round phenotype scores to integers for clean UI compatibility
  const roundedScores: Record<string, number> = {};
  for (const ph of allPhenotypes) {
    roundedScores[ph] = Math.round(scores[ph]);
  }

  const nonNorMax = Math.max(
    ...allPhenotypes.filter((p) => p !== 'NOR').map((p) => roundedScores[p])
  );
  if (nonNorMax === 0) {
    roundedScores.NOR = Math.max(roundedScores.NOR, 8);
  } else if (nonNorMax >= 5) {
    // Prevent NOR from dominating when significant pathology exists
    roundedScores.NOR = Math.min(roundedScores.NOR, Math.max(1, nonNorMax - 2));
  }

  const sorted = allPhenotypes.slice().sort((a, b) => roundedScores[b] - roundedScores[a]);
  const primaryPhenotype = sorted[0] as Phenotype;
  const secondCandidate = sorted[1] as Phenotype;
  const secondaryPhenotype =
    secondCandidate !== 'NOR' && roundedScores[secondCandidate] >= 4
      ? secondCandidate
      : undefined;

  // Determine severity degree G0..G3 from maximum weighted deviation
  const maxWeightedDev = Math.max(
    0,
    ...examinedParameters.map((p) => p.deviation * Math.min(1.4, p.weight))
  );

  let primaryDegree: Degree = 'G1';
  if (primaryPhenotype === 'NOR') {
    primaryDegree = maxWeightedDev > 12 ? 'G1' : 'G0';
  } else if (primaryPhenotype === 'REM' && maxWeightedDev <= 10) {
    primaryDegree = 'G0';
  } else if (maxWeightedDev >= 34 || criticalCount >= 2) {
    primaryDegree = 'G3';
  } else if (maxWeightedDev >= 16 || criticalCount >= 1) {
    primaryDegree = 'G2';
  } else {
    primaryDegree = 'G1';
  }

  const secondaryDegree: Degree =
    primaryDegree === 'G0' ? 'G1' : primaryDegree === 'G3' ? 'G2' : primaryDegree;

  const primaryCode = `MSC-${primaryPhenotype}-${primaryDegree}`;
  const code = secondaryPhenotype
    ? `${primaryCode}/${secondaryPhenotype}-${secondaryDegree}`
    : primaryCode;

  const mscCode: MSCCode = {
    primary: { phenotype: primaryPhenotype, degree: primaryDegree },
    secondary: secondaryPhenotype
      ? { phenotype: secondaryPhenotype, degree: secondaryDegree }
      : undefined,
    code,
  };

  // Build clinical parameter interaction insights
  const interactions: ParameterInteractionInsight[] = [];
  const barP = byId.get('barrier');
  const vasP = byId.get('vascular');
  const elaP = byId.get('elasticity');
  const pigP = byId.get('pigmentation_scars');
  const remP = byId.get('remodeling');

  if (sebumP && hydP && sebumP.value > 50 && hydP.value < 52) {
    interactions.push({
      id: 'dehydrated_seborrhea',
      title: 'Łojotok z odwodnieniem naskórka',
      severity: 'priority',
      description:
        'Podwyższone wydzielanie sebum współwystępuje z obniżonym nawilżeniem warstwy rogowej. Zbyt agresywne odtłuszczanie może wtórnie nasilać łojotok — wprowadź lekkie humektanty przed regulacją kwasami.',
      involvedParameters: [sebumP.shortName, hydP.shortName],
    });
  }

  if (barP && vasP && barP.value < 60 && vasP.value > 35) {
    interactions.push({
      id: 'vascular_barrier_axis',
      title: 'Sprzężenie naczyniowo-barierowe',
      severity: 'priority',
      description:
        'Osłabiona szczelność bariery (TEWL) potęguje reaktywność naczyniową i rumień neurogenny. Przed wdrożeniem składników aktywnych konieczna jest odbudowa cementu międzykomórkowego ceramidami.',
      involvedParameters: [barP.shortName, vasP.shortName],
    });
  }

  if (poresP && pigP && poresP.value > 40 && pigP.value > 30) {
    interactions.push({
      id: 'post_inflammatory_triad',
      title: 'Ryzyko utrwaleń pozapalnych (PIH)',
      severity: 'attention',
      description:
        'Jednoczesna obecność rozszerzonych porów/zaskórników oraz zmian pigmentacyjnych wskazuje na skłonność do przebarwień pozapalnych. Połącz kwas azelainowy z codzienną fotoprotekcją SPF 50+.',
      involvedParameters: [poresP.shortName, pigP.shortName],
    });
  }

  if (remP && barP && remP.value > 30 && barP.value < 65) {
    interactions.push({
      id: 'post_procedure_recovery',
      title: 'Okno regeneracji pozabiegowej',
      severity: 'priority',
      description:
        'Skóra w aktywnej przebudowie wykazuje obniżoną rezerwę barierową. Przez 2–4 tygodnie wstrzymaj eksfoliację kwasową na rzecz lipidów naprawczych i filtrów mineralnych.',
      involvedParameters: [remP.shortName, barP.shortName],
    });
  }

  if (elaP && hydP && elaP.value < 60 && hydP.value < 55) {
    interactions.push({
      id: 'structural_dehydration_aging',
      title: 'Nasilenie linii zmarszczkowych przez dehydratację',
      severity: 'attention',
      description:
        'Obniżona elastyczność w połączeniu z deficytem wody wyostrza widoczność zmarszczek powierzchownych. Wielopoziomowe nawilżanie szybko poprawi optyczne napięcie skóry.',
      involvedParameters: [elaP.shortName, hydP.shortName],
    });
  }

  if (interactions.length === 0) {
    if (criticalCount === 0 && moderateCount <= 1) {
      interactions.push({
        id: 'physiological_homeostasis',
        title: 'Stabilna homeostaza badanych parametrów',
        severity: 'info',
        description:
          'Badane parametry skóry mieszczą się w fizjologicznych zakresach referencyjnych lub wykazują minimalne odchylenia. Kontynuuj pielęgnację podtrzymującą i fotoprotekcję.',
        involvedParameters: examinedParameters.slice(0, 3).map((p) => p.shortName),
      });
    } else {
      const topDeviated = [...examinedParameters]
        .sort((a, b) => b.deviation - a.deviation)
        .slice(0, 2);
      interactions.push({
        id: 'targeted_correction',
        title: 'Ukierunkowana korekta odchyleń',
        severity: 'attention',
        description: `Największe odchylenie od normy klinicznej dotyczy parametrów: ${topDeviated
          .map((p) => p.name.toLowerCase())
          .join(' oraz ')}. Skoncentruj pielęgnację na ich stopniowej normalizacji.`,
        involvedParameters: topDeviated.map((p) => p.shortName),
      });
    }
  }

  return {
    examinedParameters,
    optimalCount,
    moderateCount,
    criticalCount,
    balanceIndex,
    mscCode,
    phenotypeScores: roundedScores,
    interactions,
  };
}

export function buildParameterAwareRecommendations(
  analysis: SkinParameterAnalysisResult
): Recommendation[] {
  const base = generateRecommendations(
    analysis.mscCode.primary.phenotype,
    analysis.mscCode.primary.degree
  );

  const deviated = [...analysis.examinedParameters]
    .filter((p) => p.status !== 'optimal')
    .sort((a, b) => b.deviation * b.weight - a.deviation * a.weight)
    .slice(0, 2);

  const extra: Recommendation[] = deviated.map((param) => ({
    category: `Korekta parametru: ${param.shortName}`,
    title: `${param.name} (${param.value}${param.unit} · norma ${param.optimalMin}–${param.optimalMax}${param.unit})`,
    description: `${param.clinicalSummary} Rekomendowane substancje aktywne: ${param.recommendedActives}.`,
    priority: param.status === 'critical' ? 'high' : 'medium',
  }));

  return [...extra, ...base];
}

export function serializeParametersIntoAnswers(
  baseAnswers: Record<string, string>,
  configs: SkinParameterConfig[]
): Record<string, string> {
  const compact = configs.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    category: c.category,
    unit: c.unit,
    description: c.description,
    optimalMin: c.optimalMin,
    optimalMax: c.optimalMax,
    polarity: c.polarity,
    value: c.value,
    weight: c.weight,
    enabled: c.enabled,
    isCustom: c.isCustom,
    linkedPhenotypes: c.linkedPhenotypes,
    lowHint: c.lowHint,
    highHint: c.highHint,
    optimalHint: c.optimalHint,
    recommendedActives: c.recommendedActives,
  }));

  return {
    ...baseAnswers,
    _msc_params_v1: JSON.stringify(compact),
  };
}

export function extractParametersFromAnswers(
  answers: Record<string, string> | null | undefined
): SkinParameterConfig[] {
  if (answers && typeof answers._msc_params_v1 === 'string') {
    try {
      const parsed = JSON.parse(answers._msc_params_v1) as SkinParameterConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fall through to derivation from questionnaire answers
    }
  }
  return deriveParameterValuesFromAnswers(
    (answers ?? {}) as Partial<QuestionnaireAnswers>,
    cloneDefaultParameters()
  );
}

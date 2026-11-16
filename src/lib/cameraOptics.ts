export interface CameraParameters {
  exposureEv: number; // -2.0 to +2.0 EV
  iso: number; // 50 to 1600
  shutterDenominator: number; // e.g. 125 => 1/125s
  zoom: number; // 1.0 to 4.0x
  focusMode: 'auto' | 'manual';
  focusDistanceCm: number; // 8 to 100 cm
  wbKelvin: number; // 2800 to 8500 K
  wbTint: number; // -50 (green) to +50 (magenta)
  wbGains: { r: number; g: number; b: number };
  microContrast: number; // -30 to +30
  focusPeaking: boolean;
  showGridOverlay: boolean;
}

export interface WhiteBalancePreset {
  id: string;
  label: string;
  kelvin: number;
  tint: number;
}

export const WHITE_BALANCE_PRESETS: WhiteBalancePreset[] = [
  { id: 'daylight', label: 'Światło dzienne (5500K)', kelvin: 5500, tint: 0 },
  { id: 'ring_led', label: 'Lampa LED Ring (5000K)', kelvin: 5000, tint: 2 },
  { id: 'clinic', label: 'Gabinet kliniczny (4200K)', kelvin: 4200, tint: -3 },
  { id: 'tungsten', label: 'Światło ciepłe (3200K)', kelvin: 3200, tint: 0 },
  { id: 'shade', label: 'Chłodny cień (6800K)', kelvin: 6800, tint: 4 },
];

export const DEFAULT_CAMERA_PARAMETERS: CameraParameters = {
  exposureEv: 0,
  iso: 100,
  shutterDenominator: 125,
  zoom: 1.0,
  focusMode: 'auto',
  focusDistanceCm: 28,
  wbKelvin: 5500,
  wbTint: 0,
  wbGains: { r: 1, g: 1, b: 1 },
  microContrast: 8,
  focusPeaking: false,
  showGridOverlay: true,
};

export type SensorQualityLevel = 'optimal' | 'warning' | 'critical';

export interface LightSensorReading {
  status: SensorQualityLevel;
  score: number; // 0..100 overall lighting score
  meanLuminancePct: number; // 0..100 IRE
  estimatedLux: number;
  glareClippingPct: number; // specular reflection %
  shadowClippingPct: number; // crushed blacks %
  uniformityPct: number; // 0..100 spatial illumination symmetry
  histogram: number[]; // 24 normalized bins (0..100)
  label: string;
  guidance: string;
}

export interface FocusSensorReading {
  status: SensorQualityLevel;
  score: number; // 0..100 sharpness index
  edgeDensityPct: number;
  laplacianVariance: number;
  optimalWorkingDistanceCm: number;
  label: string;
  guidance: string;
}

export interface WhiteBalanceCalibrationResult {
  measuredKelvin: number;
  measuredTint: number;
  gains: { r: number; g: number; b: number };
  deltaE: number; // residual color cast after calibration
  sampledRgb: [number, number, number];
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Converts a target white-balance Kelvin (2800..8500) + Tint (-50..+50)
 * into RGB channel multipliers relative to neutral D55 (5500K).
 */
export function computeKelvinMultipliers(
  kelvin: number,
  tint: number,
  spotGains: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  // Shift relative to 5500K reference: higher WB Kelvin warms the image (compensates cool light)
  const tempShift = (kelvin - 5500) / 5500;
  const rTemp = 1 + tempShift * 0.42;
  const bTemp = 1 - tempShift * 0.42;
  const gTint = 1 - (tint / 100) * 0.28;
  const rbTint = 1 + (tint / 100) * 0.14;

  return {
    r: clamp(rTemp * rbTint * spotGains.r, 0.5, 2.2),
    g: clamp(gTint * spotGains.g, 0.5, 2.2),
    b: clamp(bTemp * rbTint * spotGains.b, 0.5, 2.2),
  };
}

/**
 * Calibrates white balance from an ImageData patch (e.g. 18% gray card or white reference target)
 * using von Kries chromatic adaptation and McCamy's CCT approximation.
 */
export function calibrateWhiteBalanceFromPatch(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  patchRadius = 14
): WhiteBalanceCalibrationResult {
  const { width, height, data } = imageData;
  const x0 = Math.max(0, Math.floor(centerX - patchRadius));
  const x1 = Math.min(width - 1, Math.ceil(centerX + patchRadius));
  const y0 = Math.max(0, Math.floor(centerY - patchRadius));
  const y1 = Math.min(height - 1, Math.ceil(centerY + patchRadius));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Exclude completely saturated specular pixels or pure black noise
      if (r < 252 && g < 252 && b < 252 && r + g + b > 30) {
        sumR += r;
        sumG += g;
        sumB += b;
        count++;
      }
    }
  }

  if (count === 0) {
    return {
      measuredKelvin: 5500,
      measuredTint: 0,
      gains: { r: 1, g: 1, b: 1 },
      deltaE: 0.8,
      sampledRgb: [180, 180, 180],
    };
  }

  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

  const gainR = clamp(lum / Math.max(12, avgR), 0.6, 1.85);
  const gainG = clamp(lum / Math.max(12, avgG), 0.6, 1.85);
  const gainB = clamp(lum / Math.max(12, avgB), 0.6, 1.85);

  // Approximate scene illuminant CCT via R/B ratio mapped to McCamy range
  const rbRatio = avgR / Math.max(12, avgB);
  // If scene patch had excess blue (rbRatio < 1), compensating WB Kelvin is warmer (> 5500K)
  const estimatedKelvin = Math.round(clamp(5500 / Math.pow(rbRatio, 0.65), 2800, 8500));
  const greenBias = (avgG - (avgR + avgB) * 0.5) / Math.max(30, lum);
  const estimatedTint = Math.round(clamp(greenBias * 85, -50, 50));

  const residualCast =
    Math.abs(avgR * gainR - lum) +
    Math.abs(avgG * gainG - lum) +
    Math.abs(avgB * gainB - lum);
  const deltaE = Math.round(clamp(0.4 + residualCast * 0.08, 0.3, 4.5) * 10) / 10;

  return {
    measuredKelvin: estimatedKelvin,
    measuredTint: estimatedTint,
    gains: { r: gainR, g: gainG, b: gainB },
    deltaE,
    sampledRgb: [Math.round(avgR), Math.round(avgG), Math.round(avgB)],
  };
}

/**
 * Built-in Proper Lighting Sensor:
 * Evaluates exposure IRE, glare clipping, shadow clipping, and 4-quadrant illumination symmetry.
 */
export function analyzeLightingQuality(imageData: ImageData): LightSensorReading {
  const { width, height, data } = imageData;
  const bins = new Array<number>(24).fill(0);

  let totalLum = 0;
  let glarePixels = 0;
  let shadowPixels = 0;
  let qTL = 0, cTL = 0;
  let qTR = 0, cTR = 0;
  let qBL = 0, cBL = 0;
  let qBR = 0, cBR = 0;

  const step = 2;
  const midX = width / 2;
  const midY = height / 2;
  let totalSamples = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      totalLum += lum;
      totalSamples++;

      if (r > 246 || g > 246 || b > 246) glarePixels++;
      if (lum < 18) shadowPixels++;

      const binIdx = Math.min(23, Math.floor((lum / 256) * 24));
      bins[binIdx]++;

      // Sample inner 70% region for facial lighting uniformity
      if (x > width * 0.15 && x < width * 0.85 && y > height * 0.12 && y < height * 0.88) {
        if (x < midX && y < midY) { qTL += lum; cTL++; }
        else if (x >= midX && y < midY) { qTR += lum; cTR++; }
        else if (x < midX && y >= midY) { qBL += lum; cBL++; }
        else { qBR += lum; cBR++; }
      }
    }
  }

  const n = Math.max(1, totalSamples);
  const meanLum = totalLum / n;
  const meanLuminancePct = Math.round((meanLum / 255) * 100);
  const glareClippingPct = Math.round((glarePixels / n) * 1000) / 10;
  const shadowClippingPct = Math.round((shadowPixels / n) * 1000) / 10;

  const quadMeans = [
    cTL > 0 ? qTL / cTL : meanLum,
    cTR > 0 ? qTR / cTR : meanLum,
    cBL > 0 ? qBL / cBL : meanLum,
    cBR > 0 ? qBR / cBR : meanLum,
  ];
  const maxQuadDiff = Math.max(...quadMeans) - Math.min(...quadMeans);
  const uniformityPct = Math.round(clamp(100 - (maxQuadDiff / Math.max(35, meanLum)) * 85, 15, 100));

  const maxBin = Math.max(1, ...bins);
  const histogram = bins.map((b) => Math.round((b / maxBin) * 100));

  // Estimate clinical illuminance in lux (calibrated around ~450-700 lx at optimal 52-68% IRE)
  const estimatedLux = Math.round(clamp(Math.pow(meanLuminancePct / 10, 2.05) * 16, 25, 2400));

  // Compute composite lighting quality score
  let score = 100;
  if (meanLuminancePct < 42) score -= (42 - meanLuminancePct) * 1.9;
  if (meanLuminancePct > 74) score -= (meanLuminancePct - 74) * 2.1;
  if (glareClippingPct > 3.5) score -= (glareClippingPct - 3.5) * 4.2;
  if (shadowClippingPct > 12) score -= (shadowClippingPct - 12) * 1.5;
  if (uniformityPct < 78) score -= (78 - uniformityPct) * 0.9;
  score = Math.round(clamp(score, 5, 100));

  let status: SensorQualityLevel = 'optimal';
  let label = 'Światło prawidłowe';
  let guidance = 'Ekspozycja i równomierność oświetlenia w normie diagnostycznej.';

  if (meanLuminancePct < 34) {
    status = 'critical';
    label = 'Niedostateczne światło';
    guidance = 'Zwiększ natężenie oświetlenia lub podnieś ekspozycję (EV / ISO).';
  } else if (meanLuminancePct > 80 || glareClippingPct > 8) {
    status = 'critical';
    label = 'Prześwietlenie / odblaski';
    guidance = 'Zredukuj ekspozycję EV lub odsuń źródło światła — odblaski maskują pory skóry.';
  } else if (uniformityPct < 66) {
    status = 'warning';
    label = 'Cień boczny na skórze';
    guidance = 'Wyrównaj kąt padania światła po obu stronach twarzy przed rejestracją 3D.';
  } else if (score < 74) {
    status = 'warning';
    label = 'Światło akceptowalne';
    guidance = 'Drobna korekta EV (+0.2 / -0.2) poprawi czytelność mikro-tekstury.';
  }

  return {
    status,
    score,
    meanLuminancePct,
    estimatedLux,
    glareClippingPct,
    shadowClippingPct,
    uniformityPct,
    histogram,
    label,
    guidance,
  };
}

/**
 * Built-in Proper Focus Sensor:
 * Computes Tenengrad Sobel gradient magnitude + Laplacian variance in the central diagnostic ROI.
 */
export function analyzeFocusQuality(imageData: ImageData): FocusSensorReading {
  const { width, height, data } = imageData;
  const xStart = Math.floor(width * 0.25);
  const xEnd = Math.floor(width * 0.75);
  const yStart = Math.floor(height * 0.22);
  const yEnd = Math.floor(height * 0.78);

  const roiW = xEnd - xStart;
  const roiH = yEnd - yStart;
  if (roiW < 8 || roiH < 8) {
    return {
      status: 'warning',
      score: 50,
      edgeDensityPct: 10,
      laplacianVariance: 0,
      optimalWorkingDistanceCm: 28,
      label: 'Inicjalizacja czujnika',
      guidance: 'Oczekiwanie na klatkę obrazu…',
    };
  }

  // Convert ROI to grayscale buffer
  const gray = new Float32Array(roiW * roiH);
  for (let y = 0; y < roiH; y++) {
    const srcY = yStart + y;
    for (let x = 0; x < roiW; x++) {
      const idx = (srcY * width + (xStart + x)) * 4;
      gray[y * roiW + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  let lapSum = 0;
  let lapSqSum = 0;
  let sobelStrongEdges = 0;
  let count = 0;

  for (let y = 1; y < roiH - 1; y++) {
    for (let x = 1; x < roiW - 1; x++) {
      const c = gray[y * roiW + x];
      const top = gray[(y - 1) * roiW + x];
      const bottom = gray[(y + 1) * roiW + x];
      const left = gray[y * roiW + (x - 1)];
      const right = gray[y * roiW + (x + 1)];

      const lap = top + bottom + left + right - 4 * c;
      lapSum += lap;
      lapSqSum += lap * lap;

      const gx =
        -gray[(y - 1) * roiW + (x - 1)] +
        gray[(y - 1) * roiW + (x + 1)] -
        2 * left +
        2 * right -
        gray[(y + 1) * roiW + (x - 1)] +
        gray[(y + 1) * roiW + (x + 1)];
      const gy =
        -gray[(y - 1) * roiW + (x - 1)] -
        2 * top -
        gray[(y - 1) * roiW + (x + 1)] +
        gray[(y + 1) * roiW + (x - 1)] +
        2 * bottom +
        gray[(y + 1) * roiW + (x + 1)];

      const mag = Math.hypot(gx, gy);
      if (mag > 42) sobelStrongEdges++;
      count++;
    }
  }

  const n = Math.max(1, count);
  const meanLap = lapSum / n;
  const laplacianVariance = Math.max(0, lapSqSum / n - meanLap * meanLap);
  const edgeDensityPct = Math.round((sobelStrongEdges / n) * 1000) / 10;

  // Map Laplacian variance & edge density onto a clinical 0..100 sharpness scale
  const rawScore = Math.sqrt(laplacianVariance) * 5.2 + edgeDensityPct * 1.45;
  const score = Math.round(clamp(rawScore, 6, 99));

  let status: SensorQualityLevel = 'optimal';
  let label = 'Ostrość prawidłowa';
  let guidance = 'Mikrotekstura porów i linii naskórka mieści się w płaszczyźnie ostrości.';

  if (score < 36) {
    status = 'critical';
    label = 'Brak ostrości';
    guidance = 'Skoryguj odległość (ok. 25–32 cm) lub wyreguluj suwak ostrości MF.';
  } else if (score < 60) {
    status = 'warning';
    label = 'Lekkie rozmycie';
    guidance = 'Ustabilizuj dłoń przed rozpoczęciem rejestracji filmu i skanu LiDAR.';
  }

  return {
    status,
    score,
    edgeDensityPct,
    laplacianVariance: Math.round(laplacianVariance * 10) / 10,
    optimalWorkingDistanceCm: 28,
    label,
    guidance,
  };
}

/**
 * Renders a synthetic clinical skin/facial optical phantom onto the canvas when no physical camera
 * is connected or when Optical Phantom Calibration Mode is active, so all WB, EV, Focus, Light
 * sensors, video recording, and LiDAR 3D reconstruction work seamlessly in every environment.
 */
export function drawOpticalSkinPhantom(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number
): void {
  // Subtle ambient background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#1c2a38');
  bg.addColorStop(1, '#101b27');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle head/face gentle scan oscillation during capture
  const swayX = Math.sin(elapsedSec * 0.9) * width * 0.025;
  const swayY = Math.cos(elapsedSec * 0.65) * height * 0.01;
  const cx = width * 0.5 + swayX;
  const cy = height * 0.5 + swayY;
  const rx = Math.min(width, height) * 0.31;
  const ry = Math.min(width, height) * 0.4;

  // Calibration 18% neutral gray reference patch in top-left corner for Spot WB testing
  ctx.save();
  ctx.fillStyle = 'rgb(168, 164, 158)';
  ctx.fillRect(Math.round(width * 0.05), Math.round(height * 0.08), 54, 38);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(width * 0.05), Math.round(height * 0.08), 54, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '10px sans-serif';
  ctx.fillText('WB 18%', Math.round(width * 0.05) + 8, Math.round(height * 0.08) + 23);
  ctx.restore();

  // Base 3D-shaded facial oval
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  const skinGrad = ctx.createRadialGradient(
    cx - rx * 0.14,
    cy - ry * 0.16,
    rx * 0.08,
    cx,
    cy,
    ry * 1.05
  );
  skinGrad.addColorStop(0, '#f3d3be');
  skinGrad.addColorStop(0.45, '#e2b69c');
  skinGrad.addColorStop(0.82, '#c69378');
  skinGrad.addColorStop(1, '#9d6d56');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

  // T-zone subtle sebum highlight & cheek vascular warmth
  const cheekL = ctx.createRadialGradient(
    cx - rx * 0.44,
    cy + ry * 0.08,
    4,
    cx - rx * 0.44,
    cy + ry * 0.08,
    rx * 0.36
  );
  cheekL.addColorStop(0, 'rgba(216, 112, 108, 0.28)');
  cheekL.addColorStop(1, 'rgba(216, 112, 108, 0)');
  ctx.fillStyle = cheekL;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

  const cheekR = ctx.createRadialGradient(
    cx + rx * 0.44,
    cy + ry * 0.08,
    4,
    cx + rx * 0.44,
    cy + ry * 0.08,
    rx * 0.36
  );
  cheekR.addColorStop(0, 'rgba(216, 112, 108, 0.26)');
  cheekR.addColorStop(1, 'rgba(216, 112, 108, 0)');
  ctx.fillStyle = cheekR;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

  // Nose bridge volumetric ridge
  const noseGrad = ctx.createLinearGradient(cx - rx * 0.14, cy, cx + rx * 0.14, cy);
  noseGrad.addColorStop(0, 'rgba(130, 85, 65, 0.22)');
  noseGrad.addColorStop(0.5, 'rgba(255, 238, 226, 0.42)');
  noseGrad.addColorStop(1, 'rgba(130, 85, 65, 0.24)');
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.roundRect(cx - rx * 0.11, cy - ry * 0.24, rx * 0.22, ry * 0.44, 16);
  ctx.fill();

  // Brow arches & subtle ocular contours
  ctx.strokeStyle = 'rgba(92, 60, 46, 0.48)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx - rx * 0.36, cy - ry * 0.12, rx * 0.22, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + rx * 0.36, cy - ry * 0.12, rx * 0.22, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Crisp dermoscopic micro-pore & fine skin-line texture deterministic grid (enables real Focus Sensor measurement!)
  for (let py = -ry * 0.78; py <= ry * 0.78; py += 7) {
    for (let px = -rx * 0.78; px <= rx * 0.78; px += 7) {
      const hash = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
      const frac = hash - Math.floor(hash);
      if (frac > 0.42) {
        const jx = cx + px + (frac - 0.5) * 4;
        const jy = cy + py + ((frac * 7) % 1 - 0.5) * 4;
        ctx.fillStyle =
          frac > 0.86 ? 'rgba(115, 72, 56, 0.42)' : 'rgba(148, 98, 78, 0.25)';
        ctx.fillRect(jx, jy, 1.7, 1.7);
      }
    }
  }

  // Fine nasolabial & periorbital micro-lines
  ctx.strokeStyle = 'rgba(128, 82, 64, 0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.16, cy + ry * 0.16);
  ctx.quadraticCurveTo(cx - rx * 0.34, cy + ry * 0.32, cx - rx * 0.28, cy + ry * 0.48);
  ctx.moveTo(cx + rx * 0.16, cy + ry * 0.16);
  ctx.quadraticCurveTo(cx + rx * 0.34, cy + ry * 0.32, cx + rx * 0.28, cy + ry * 0.48);
  ctx.stroke();

  ctx.restore();
}

/**
 * Applies exposure (EV + ISO + Shutter), White Balance (Kelvin + Tint + Spot Gains),
 * Dermoscopic Micro-Contrast, Manual Focus optical defocus simulation, and optional Focus Peaking
 * onto the output canvas, returning the calibrated ImageData for sensors & 3D capture.
 */
export function processOpticalFrame(
  sourceCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  params: CameraParameters
): ImageData {
  const width = outputCanvas.width;
  const height = outputCanvas.height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!;

  outCtx.save();
  outCtx.clearRect(0, 0, width, height);

  // Manual focus optical blur when focusMode === 'manual' and distance deviates from 28cm plane
  const defocusDelta =
    params.focusMode === 'manual' ? Math.abs(params.focusDistanceCm - 28) : 0;
  const blurPx = defocusDelta > 2 ? Math.min(9, (defocusDelta - 2) * 0.22) : 0;
  if (blurPx > 0.2) {
    outCtx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }

  // Apply zoom around optical center
  const z = clamp(params.zoom, 1, 4);
  const srcW = sourceCanvas.width / z;
  const srcH = sourceCanvas.height / z;
  const srcX = (sourceCanvas.width - srcW) / 2;
  const srcY = (sourceCanvas.height - srcH) / 2;

  outCtx.drawImage(sourceCanvas, srcX, srcY, srcW, srcH, 0, 0, width, height);
  outCtx.restore();

  const imgData = outCtx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Exposure multiplier from EV, ISO (ref 100), and Shutter (ref 1/125s)
  const isoStops = Math.log2(Math.max(50, params.iso) / 100);
  const shutterStops = Math.log2(125 / Math.max(15, params.shutterDenominator));
  const totalStops = params.exposureEv + isoStops * 0.45 + shutterStops * 0.45;
  const expGain = Math.pow(2, clamp(totalStops, -2.8, 2.8));

  const wb = computeKelvinMultipliers(params.wbKelvin, params.wbTint, params.wbGains);
  const contrastFactor =
    (259 * (params.microContrast * 1.6 + 255)) /
    (255 * (259 - params.microContrast * 1.6));

  const rMult = expGain * wb.r;
  const gMult = expGain * wb.g;
  const bMult = expGain * wb.b;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * rMult;
    let g = d[i + 1] * gMult;
    let b = d[i + 2] * bMult;

    if (params.microContrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }

  // Clone clean calibrated frame BEFORE drawing visual overlays (peaking) for accurate sensor & 3D texture
  const calibratedClean = new ImageData(new Uint8ClampedArray(d), width, height);

  if (params.focusPeaking) {
    // Highlight sharp micro-edges in gold/emerald for focus peaking assistance
    const src = calibratedClean.data;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxR = (y * width + (x + 1)) * 4;
        const idxB = ((y + 1) * width + x) * 4;
        const lum = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
        const lumR = 0.299 * src[idxR] + 0.587 * src[idxR + 1] + 0.114 * src[idxR + 2];
        const lumB = 0.299 * src[idxB] + 0.587 * src[idxB + 1] + 0.114 * src[idxB + 2];
        const grad = Math.abs(lum - lumR) + Math.abs(lum - lumB);
        if (grad > 28) {
          d[idx] = 52;
          d[idx + 1] = 211;
          d[idx + 2] = 153;
        }
      }
    }
  }

  outCtx.putImageData(imgData, 0, 0);
  return calibratedClean;
}

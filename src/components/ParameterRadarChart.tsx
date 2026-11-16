import type { AnalyzedSkinParameter } from '../types';

interface ParameterRadarChartProps {
  parameters: AnalyzedSkinParameter[];
  balanceIndex: number;
}

export default function ParameterRadarChart({
  parameters,
  balanceIndex,
}: ParameterRadarChartProps) {
  const items = parameters.slice(0, 10);
  const count = items.length;

  if (count < 3) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-skin-50 rounded-2xl border border-skin-100">
        <div className="font-serif text-4xl text-navy-900 tabular-nums mb-1">{balanceIndex}/100</div>
        <p className="text-xs text-navy-500 font-sans mb-2">Indeks równowagi skóry</p>
        <p className="text-xs text-navy-400 font-sans max-w-xs">
          Włącz co najmniej 3 parametry badawcze, aby wygenerować wieloosiowy wykres radarowy profilu skóry.
        </p>
      </div>
    );
  }

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 96;
  const rings = [25, 50, 75, 100];

  const angleFor = (index: number) => (Math.PI * 2 * index) / count - Math.PI / 2;

  const pointAt = (index: number, pct: number) => {
    const angle = angleFor(index);
    const r = (Math.max(0, Math.min(100, pct)) / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const valuePolygon = items
    .map((item, idx) => {
      const pt = pointAt(idx, item.value);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const normMidPolygon = items
    .map((item, idx) => {
      const mid = (item.optimalMin + item.optimalMax) / 2;
      const pt = pointAt(idx, mid);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[320px] aspect-square relative">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Wykres radarowy badanych parametrów skóry"
        >
          {/* Concentric scale rings */}
          {rings.map((ring) => (
            <circle
              key={ring}
              cx={cx}
              cy={cy}
              r={(ring / 100) * maxR}
              fill="none"
              stroke="#e4d9cc"
              strokeWidth={ring === 100 ? 1.2 : 0.75}
              strokeDasharray={ring === 50 ? '3 3' : undefined}
            />
          ))}

          {/* Radial axes */}
          {items.map((item, idx) => {
            const outer = pointAt(idx, 100);
            const optMinPt = pointAt(idx, item.optimalMin);
            const optMaxPt = pointAt(idx, item.optimalMax);
            return (
              <g key={item.id}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#e4d9cc"
                  strokeWidth="0.8"
                />
                {/* Optimal norm segment along each axis */}
                <line
                  x1={optMinPt.x}
                  y1={optMinPt.y}
                  x2={optMaxPt.x}
                  y2={optMaxPt.y}
                  stroke="#627d98"
                  strokeOpacity="0.45"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Physiological norm reference polygon */}
          <polygon
            points={normMidPolygon}
            fill="#627d98"
            fillOpacity="0.08"
            stroke="#627d98"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Examined patient values polygon */}
          <polygon
            points={valuePolygon}
            fill="#c9944a"
            fillOpacity="0.22"
            stroke="#c9944a"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Data vertices & outer labels */}
          {items.map((item, idx) => {
            const pt = pointAt(idx, item.value);
            const labelAngle = angleFor(idx);
            const labelR = maxR + 24;
            const lx = cx + Math.cos(labelAngle) * labelR;
            const ly = cy + Math.sin(labelAngle) * labelR;
            const anchor =
              Math.abs(Math.cos(labelAngle)) < 0.2
                ? 'middle'
                : Math.cos(labelAngle) > 0
                  ? 'start'
                  : 'end';

            const vertexFill =
              item.status === 'critical'
                ? '#e11d48'
                : item.status === 'moderate'
                  ? '#d97706'
                  : '#102a43';

            return (
              <g key={item.id}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill={vertexFill}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={lx}
                  y={ly - 3}
                  textAnchor={anchor}
                  className="fill-navy-800 text-[10px] font-sans font-medium"
                >
                  {item.shortName}
                </text>
                <text
                  x={lx}
                  y={ly + 9}
                  textAnchor={anchor}
                  className="fill-navy-500 text-[9px] font-sans tabular-nums"
                >
                  {item.value}
                  {item.unit}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center gap-5 text-xs text-navy-500 font-sans mt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gold-500 inline-block" />
          Wynik badany
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-navy-500/50 inline-block" />
          Zakres normy
        </span>
      </div>
    </div>
  );
}

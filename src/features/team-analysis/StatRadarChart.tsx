import type { StatId, StatsTable } from '@/domain/types';

interface StatRadarChartProps {
  averages: StatsTable;
  peaks: StatsTable;
}

const AXES: readonly { key: StatId; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'Atk' },
  { key: 'def', label: 'Def' },
  { key: 'spe', label: 'Spe' },
  { key: 'spd', label: 'SpD' },
  { key: 'spa', label: 'SpA' },
];

const MAX_STAT_SCALE = 150;
const CENTER = 120;
const RADIUS = 82;

function polarToCartesian(index: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  const clamped = Math.min(value, MAX_STAT_SCALE) / MAX_STAT_SCALE;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * clamped,
    y: CENTER + Math.sin(angle) * RADIUS * clamped,
  };
}

function buildPolygonPoints(stats: StatsTable): string {
  return AXES.map((axis, idx) => {
    const pt = polarToCartesian(idx, stats[axis.key]);
    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(' ');
}

export function StatRadarChart({ averages, peaks }: StatRadarChartProps) {
  const rings = [50, 100, 150] as const;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 240 240"
        className="h-56 w-56 overflow-visible"
        role="img"
        aria-label="Team base stat radar chart comparing team averages and peaks"
      >
        <title>Team Base Stat Radar</title>

        {/* Reference Rings */}
        {rings.map((ring) => {
          const pts = AXES.map((_, idx) => {
            const pt = polarToCartesian(idx, ring);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          }).join(' ');
          return (
            <polygon
              key={ring}
              points={pts}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Spokes */}
        {AXES.map((axis, idx) => {
          const outer = polarToCartesian(idx, MAX_STAT_SCALE);
          const labelPos = polarToCartesian(idx, MAX_STAT_SCALE + 26);
          return (
            <g key={axis.key}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[var(--ink-secondary)] text-[11px] font-semibold"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Team Peak Polygon */}
        <polygon
          points={buildPolygonPoints(peaks)}
          fill="color-mix(in srgb, var(--ink-muted) 10%, transparent)"
          stroke="var(--ink-muted)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Team Average Polygon */}
        <polygon
          points={buildPolygonPoints(averages)}
          fill="color-mix(in srgb, var(--accent-primary) 26%, transparent)"
          stroke="var(--accent-primary)"
          strokeWidth="2"
        />
      </svg>

      <div className="mt-1 flex items-center gap-4 text-[11px] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-[var(--accent-primary)]" aria-hidden="true" />
          <span>Team Average</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-3 border-t-2 border-dashed border-[var(--ink-muted)]"
            aria-hidden="true"
          />
          <span>Team Peak (150 scale)</span>
        </span>
      </div>
    </div>
  );
}

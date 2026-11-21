import type { StatsTable } from '@/domain/types';
import { MAX_BASE_STAT_SCALE, STAT_RADAR_AXES, STAT_RADAR_RINGS } from './statDisplayConfig';

interface StatRadarChartProps {
  averages: StatsTable;
  peaks: StatsTable;
}

const CENTER = 120;
const RADIUS = 82;
const LABEL_OFFSET = 18;

function polarToCartesian(index: number, radius: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / STAT_RADAR_AXES.length - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function statToRadius(value: number): number {
  return (Math.min(value, MAX_BASE_STAT_SCALE) / MAX_BASE_STAT_SCALE) * RADIUS;
}

function buildPolygonPoints(stats: StatsTable): string {
  return STAT_RADAR_AXES.map((axis, idx) => {
    const pt = polarToCartesian(idx, statToRadius(stats[axis.key]));
    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(' ');
}

export function StatRadarChart({ averages, peaks }: StatRadarChartProps) {
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
        {STAT_RADAR_RINGS.map((ring) => {
          const pts = STAT_RADAR_AXES.map((_, idx) => {
            const pt = polarToCartesian(idx, statToRadius(ring));
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
        {STAT_RADAR_AXES.map((axis, idx) => {
          const outer = polarToCartesian(idx, RADIUS);
          const labelPos = polarToCartesian(idx, RADIUS + LABEL_OFFSET);
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
                {axis.shortLabel}
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
          <span>Team Peak ({MAX_BASE_STAT_SCALE} scale)</span>
        </span>
      </div>
    </div>
  );
}

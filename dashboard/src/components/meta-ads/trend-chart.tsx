'use client';

import { IconLoader2 } from '@tabler/icons-react';

export interface DailyPoint {
  date: string;
  spend: number;
  costPerResult: number;
}

interface TrendChartProps {
  data: DailyPoint[];
  loading?: boolean;
}

const W = 300;
const H = 80;
const PAD = { top: 8, right: 10, bottom: 18, left: 36 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

function toPoints(normalized: number[], count: number): { x: number; y: number }[] {
  return normalized.map((n, i) => ({
    x: PAD.left + (count <= 1 ? INNER_W / 2 : (i / (count - 1)) * INNER_W),
    y: PAD.top + INNER_H - n * INNER_H,
  }));
}

function polyline(pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtCpl(v: number) {
  return v === 0 ? '--' : `$${v.toFixed(0)}`;
}

export function TrendChart({ data, loading }: TrendChartProps) {
  if (loading) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconLoader2 size={14} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const valid = data.filter(d => d.costPerResult > 0 || d.spend > 0);

  if (valid.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, color: '#4a5170' }}>Insufficient trend data</span>
      </div>
    );
  }

  const cplValues = valid.map(d => d.costPerResult);
  const spendValues = valid.map(d => d.spend);

  const cplNorm = normalize(cplValues);
  const spendNorm = normalize(spendValues);

  const cplPts = toPoints(cplNorm, valid.length);
  const spendPts = toPoints(spendNorm, valid.length);

  const cplMin = Math.min(...cplValues.filter(v => v > 0));
  const cplMax = Math.max(...cplValues);

  // X-axis label indices: first, middle, last
  const labelIndices = valid.length <= 4
    ? valid.map((_, i) => i)
    : [0, Math.floor((valid.length - 1) / 2), valid.length - 1];

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, paddingLeft: PAD.left }}>
        <span style={{ fontSize: 9, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-jetbrains, monospace)' }}>
          <span style={{ width: 14, height: 2, background: '#3B82F6', borderRadius: 1, display: 'inline-block' }} />
          CPL
        </span>
        <span style={{ fontSize: 9, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-jetbrains, monospace)' }}>
          <span style={{ width: 14, height: 2, background: '#f59e0b', borderRadius: 1, display: 'inline-block', opacity: 0.7 }} />
          Spend
        </span>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map(pct => (
          <line
            key={pct}
            x1={PAD.left} y1={PAD.top + INNER_H * (1 - pct)}
            x2={W - PAD.right} y2={PAD.top + INNER_H * (1 - pct)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.5}
          />
        ))}

        {/* Y axis labels (CPL) */}
        <text x={PAD.left - 3} y={PAD.top + 3} textAnchor="end" fontSize={7} fill="#4a5170">{fmtCpl(cplMax)}</text>
        <text x={PAD.left - 3} y={PAD.top + INNER_H + 3} textAnchor="end" fontSize={7} fill="#4a5170">{fmtCpl(cplMin)}</text>

        {/* Spend line (amber, dashed, behind) */}
        <polyline
          points={polyline(spendPts)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeDasharray="3 2"
        />

        {/* CPL area fill */}
        <polyline
          points={polyline(cplPts)}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2}
        />

        {/* CPL dots */}
        {cplPts.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#3B82F6" />
        ))}

        {/* X-axis date labels */}
        {labelIndices.map(i => (
          <text
            key={i}
            x={cplPts[i].x}
            y={H - 1}
            textAnchor="middle"
            fontSize={7}
            fill="#4a5170"
          >
            {fmtDate(valid[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

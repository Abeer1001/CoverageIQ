import type { ReactNode } from 'react';

interface Segment {
  value: number;
  color: string;
}

export default function DonutChart({
  segments,
  size = 168,
  thickness = 24,
  children,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = segments
    .filter(segment => segment.value > 0)
    .map(segment => {
      const start = total === 0 ? 0 : (cursor / total) * 100;
      cursor += segment.value;
      const end = total === 0 ? 0 : (cursor / total) * 100;
      return `${segment.color} ${start}% ${end}%`;
    });

  const background = total === 0
    ? 'conic-gradient(#e5e7eb 0% 100%)'
    : `conic-gradient(${stops.join(', ')})`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label="Compliance distribution">
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background }} />
      <div
        style={{
          position: 'absolute',
          inset: thickness,
          borderRadius: '50%',
          background: 'var(--color-bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

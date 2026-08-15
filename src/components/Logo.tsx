import type { CSSProperties } from 'react';

const MARK_LIGHT = '#2563eb';
const MARK_DARK = '#3b82f6';

export function LogoMark({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const fill = inverted ? MARK_DARK : MARK_LIGHT;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M16 2.6 26.6 6.9v9.1c0 6.1-4.3 10.7-10.6 13C9.7 26.7 5.4 22.1 5.4 16V6.9L16 2.6Z"
        fill={fill}
        stroke={fill}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="m11.4 16.1 3.1 3.1 6.1-6.4"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const textStyle: CSSProperties = inverted ? { color: '#f8fafc' } : {};
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontWeight: 700 }}
      className="ciq-logo"
    >
      <LogoMark size={size} inverted={inverted} />
      <span style={textStyle}>CoverageIQ</span>
    </span>
  );
}

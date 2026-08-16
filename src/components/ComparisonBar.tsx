export default function ComparisonBar({
  required,
  detected,
  detectedLabel,
}: {
  required: number;
  detected?: number | null;
  detectedLabel?: string;
}) {
  const detectedValue = typeof detected === 'number' ? detected : 0;
  const max = Math.max(required, detectedValue, 1);
  const requiredPct = (required / max) * 100;
  const detectedPct = (detectedValue / max) * 100;
  const shortfall = required - detectedValue;
  const compliant = shortfall <= 0;
  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <span>Required</span>
        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{fmt(required)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--color-neutral-bg)', overflow: 'hidden' }}>
        <div style={{ width: `${requiredPct}%`, height: '100%', borderRadius: 999, background: 'var(--color-neutral)', opacity: 0.5 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <span>Detected</span>
        <span style={{ fontWeight: 600, color: compliant ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {detectedLabel || (typeof detected === 'number' ? fmt(detectedValue) : 'Not provided')}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--color-neutral-bg)', overflow: 'hidden' }}>
        <div style={{ width: `${detectedPct}%`, height: '100%', borderRadius: 999, background: compliant ? 'var(--color-success)' : 'var(--color-danger)' }} />
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: compliant ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {compliant ? 'Meets requirement' : `${fmt(shortfall)} below requirement`}
      </div>
    </div>
  );
}

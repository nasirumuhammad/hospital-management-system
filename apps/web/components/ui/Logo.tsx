const VIEWBOX_SIZE = 32;

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} role="img" aria-label="CarePoint">
      <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} rx="9" style={{ fill: 'var(--primary)' }} />
      <path d="M8 17h16M16 17v8" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="9.5" r="2.9" style={{ fill: 'var(--accent)' }} />
    </svg>
  );
}

export function Wordmark({ subtitle = 'Hospital management' }: { subtitle?: string }) {
  return <span className="brand-name">CarePoint<small>{subtitle}</small></span>;
}

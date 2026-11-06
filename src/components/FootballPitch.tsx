export function FootballPitch() {
  return (
    <svg viewBox="0 0 72 112" width="100%" className="pointer-events-none block h-full w-full bg-pitch" role="img" aria-label="Terrain de football">
      <g className="fill-pitch-2">
        {[1, 3, 5, 7, 9].map((i) => <rect key={i} x="2" y={3.5 + i * 10.5} width="68" height="10.5" />)}
      </g>
      <g className="fill-none stroke-field-line" strokeWidth="0.3">
        <rect x="2" y="3.5" width="68" height="105" />
        <path d="M2 56H70" />
        <circle cx="36" cy="56" r="9.15" />
        <path d="M15.84 3.5V20H56.16V3.5 M26.84 3.5V9H45.16V3.5 M15.84 108.5V92H56.16V108.5 M26.84 108.5V103H45.16V108.5" />
        <path d="M28.69 20A9.15 9.15 0 0 0 43.31 20 M28.69 92A9.15 9.15 0 0 1 43.31 92" />
        <path d="M32.34 3.5V1H39.66V3.5 M32.34 108.5V111H39.66V108.5" />
      </g>
      <g className="fill-field-line">
        <circle cx="36" cy="56" r="0.35" />
        <circle cx="36" cy="14.5" r="0.35" />
        <circle cx="36" cy="97.5" r="0.35" />
      </g>
    </svg>
  );
}
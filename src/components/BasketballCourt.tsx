import { useId } from "react";

export function BasketballCourt() {
  const parquetId = useId();
  return (
    <svg viewBox="0 0 17 30" width="100%" className="pointer-events-none block h-full w-full bg-parquet" role="img" aria-label="Terrain de basketball">
      <defs>
        <pattern id={parquetId} width="1.6" height="4" patternUnits="userSpaceOnUse">
          <rect width="0.8" height="4" className="fill-parquet-alt" />
          <path d="M0 0V4 M0.8 0V4 M0 2H0.8 M0.8 0H1.6" className="stroke-parquet-grain" strokeWidth="0.025" fill="none" />
        </pattern>
      </defs>
      <rect width="17" height="30" fill={`url(#${parquetId})`} />
      <g className="fill-none stroke-field-line" strokeWidth="0.05">
        <rect x="1" y="1" width="15" height="28" />
        <path d="M1 15H16" />
        <circle cx="8.5" cy="15" r="1.8" />
        {[false, true].map((bottom) => (
          <g key={String(bottom)} transform={bottom ? "rotate(180 8.5 15)" : undefined}>
            <path d="M6.05 1V6.8H10.95V1" />
            <path d="M6.7 6.8A1.8 1.8 0 0 0 10.3 6.8" />
            <path d="M6.7 6.8A1.8 1.8 0 0 1 10.3 6.8" strokeDasharray="0.18 0.18" />
            <path d="M1.9 1V3.9901A6.75 6.75 0 0 0 15.1 3.9901V1" />
            <path d="M7.25 2.575A1.25 1.25 0 0 0 9.75 2.575" />
            <path d="M7.6 2.2H9.4" strokeWidth="0.09" />
            <circle cx="8.5" cy="2.575" r="0.225" strokeWidth="0.07" />
          </g>
        ))}
      </g>
    </svg>
  );
}
function colorForPercentage(pct: number): string {
  if (pct >= 75) return "var(--brand)";
  if (pct >= 40) return "#f5a623";
  return "var(--danger)";
}

export default function CircularProgress({
  percentage,
  label,
  size = 72,
}: {
  percentage: number;
  label: string;
  size?: number;
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorForPercentage(clamped)}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          fill="var(--foreground)"
          fontSize={size * 0.22}
          fontWeight={600}
        >
          {clamped}%
        </text>
      </svg>
      <span className="text-xs text-muted text-center max-w-[5.5rem] truncate" title={label}>
        {label}
      </span>
    </div>
  );
}

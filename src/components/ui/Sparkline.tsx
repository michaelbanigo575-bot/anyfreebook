/** Simple SVG sparkline — shared by the admin and creator dashboards. */
export function Sparkline({ values, color = '#818cf8', height = 40 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} className="w-full" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 200;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const area = `M0,${height} L${points.split(' ').join(' L')} L${w},${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <path d={area} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

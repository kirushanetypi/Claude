import * as React from "react";

export function Sparkline({
  points,
  width = 100,
  height = 28,
  color = "var(--accent)",
  fill,
  strokeWidth = 1.5,
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const n = points.length;
  const pad = 1;
  const xs = (i: number) => pad + (i * (width - 2 * pad)) / (n - 1);
  const ys = (v: number) => height - pad - ((v - min) / range) * (height - 2 * pad);
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`)
    .join(" ");
  const fillD = `${d} L${xs(n - 1).toFixed(1)},${height} L${xs(0).toFixed(1)},${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && <path d={fillD} fill={fill} />}
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

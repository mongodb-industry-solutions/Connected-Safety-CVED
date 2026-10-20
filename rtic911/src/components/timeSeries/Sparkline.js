"use client";

import { Body, Description } from "@via-ds/components/typography";
import { NOT_AVAILABLE_LABEL } from "@/lib/const/cved.js";

const WIDTH = 160;
const HEIGHT = 48;
const PAD = 8;
const LINE_COLOR = "#016BF8";
const BASELINE_COLOR = "#C1C7C6";
const SURFACE_COLOR = "#F9FBFA"; // card background, rings the markers

function stepLabel(i, count) {
  return i === count - 1 ? "crash" : `t−${count - 1 - i}`;
}

// The last values of a signal before the crash, with the values as text so the series is readable without the chart.
export default function Sparkline({ label, unit, values }) {
  const numbers = Array.isArray(values) ? values.filter((v) => typeof v === "number") : [];
  if (numbers.length < 2) {
    return (
      <div>
        <Description>{label}</Description>
        <Body>{NOT_AVAILABLE_LABEL}</Body>
      </div>
    );
  }

  const min = Math.min(...numbers, 0);
  const max = Math.max(...numbers, 0);
  const span = max - min || 1;
  const x = (i) => PAD + (i * (WIDTH - 2 * PAD)) / (numbers.length - 1);
  const y = (v) => PAD + ((max - v) * (HEIGHT - 2 * PAD)) / span;
  const points = numbers.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = numbers.length - 1;

  return (
    <div className="flex flex-col gap-1">
      <Description>{label}</Description>
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label={`${label}: ${numbers.join(", ")} ${unit}`}>
        <line x1={PAD} x2={WIDTH - PAD} y1={y(0)} y2={y(0)} stroke={BASELINE_COLOR} strokeWidth="1" />
        <polyline points={points} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {numbers.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={i === last ? 4 : 3} fill={LINE_COLOR} stroke={SURFACE_COLOR} strokeWidth="2" />
            <circle cx={x(i)} cy={y(v)} r="10" fill="transparent">
              <title>{`${stepLabel(i, numbers.length)}: ${v} ${unit}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <Body>
        {numbers.join(" → ")} {unit}
      </Body>
    </div>
  );
}

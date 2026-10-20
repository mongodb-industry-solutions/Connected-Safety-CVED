"use client";

const STATUS_COLORS = {
  new: "#DB3030",
  acknowledged: "#00684A",
};
const DEFAULT_COLOR = "#5C6C75";

export default function StatusPill({ status }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap"
      style={{ backgroundColor: STATUS_COLORS[status] ?? DEFAULT_COLOR }}
    >
      {status}
    </span>
  );
}

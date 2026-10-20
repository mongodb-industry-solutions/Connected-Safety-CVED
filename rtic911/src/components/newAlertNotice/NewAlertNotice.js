"use client";

// hex, not Via CSS variables: the notice must stay red with white text in every theme
const ALERT_RED = "#DB3030";

export default function NewAlertNotice({ count, onDismiss }) {
  return (
    <div
      role="alert"
      className="fixed top-6 right-6 z-50 flex items-center gap-4 px-5 py-3 rounded-lg shadow-lg text-white"
      style={{ backgroundColor: ALERT_RED }}
    >
      <p className="text-sm font-semibold">
        {count > 1 ? `${count} new crash alerts received` : "New crash alert received"}
      </p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-white text-lg leading-none">
        ×
      </button>
    </div>
  );
}

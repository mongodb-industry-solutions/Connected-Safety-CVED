"use client";

import { Body, Description } from "@via-ds/components/typography";
import StatusPill from "@/components/statusPill/StatusPill";
import { CVED_PATHS } from "@/lib/const/cved.js";

export default function AlertList({ alerts, selectedId, onSelect }) {
  return (
    <ul className="flex flex-col gap-2">
      {alerts.map((alert) => {
        const isSelected = alert._id === selectedId;
        return (
          <li key={alert._id}>
            <button
              type="button"
              onClick={() => onSelect(alert._id)}
              className="w-full text-left p-3 rounded-lg border"
              style={{
                borderColor: isSelected ? "var(--via-color-border-info)" : "var(--via-color-border-primary)",
                backgroundColor: isSelected ? "var(--via-color-background-info)" : "var(--via-color-background-primary)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <Body>
                  <strong>Crash alert</strong>
                  {alert.signals?.[CVED_PATHS.plateNumber] && ` · ${alert.signals[CVED_PATHS.plateNumber]}`}
                </Body>
                <StatusPill status={alert.status} />
              </div>
              <Description>{new Date(alert.receivedAt).toLocaleString()}</Description>
              {alert.repeatCount > 0 && <Description>Repeated {alert.repeatCount}×</Description>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { Card } from "@via-ds/components/card";
import { Body, Description, H3 } from "@via-ds/components/typography";
import { CVED_PATHS } from "@/lib/const/cved.js";

function toMs(value) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(ms) ? null : ms;
}

function formatDuration(ms) {
  if (ms === null) return "–";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Latency of the crash notification, from the airbag release in the vehicle to the alert in RTIC 911:
 * airbag (IncidentDateTime, sent by the Crash Monitor Agent) → cloud server (ts of the set request, crashTs)
 * → RTIC 911 (receivedAt). All containers of the demo share the host clock.
 */
export default function Latency({ alert }) {
  const airbag = toMs(alert.signals?.[CVED_PATHS.incidentDateTime]);
  const cloudTimes = (alert.crashTs ?? []).map(toMs).filter((ms) => ms !== null);
  const cloud = cloudTimes.length > 0 ? Math.min(...cloudTimes) : null;
  const rtic = toMs(alert.receivedAt);

  const diff = (from, to) => (from !== null && to !== null ? to - from : null);
  const steps = [
    { label: "Vehicle → cloud", detail: "airbag release to the cloud VISSR server", ms: diff(airbag, cloud) },
    { label: "Cloud → RTIC 911", detail: "MongoDB + REST sink to the alert API", ms: diff(cloud, rtic) },
  ];

  return (
    <Card background="secondary" density="compact">
      <div className="flex items-baseline justify-between gap-4">
        <H3>Latency</H3>
        <span className="text-2xl font-semibold">{formatDuration(diff(airbag, rtic))}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {steps.map((step) => (
          <div key={step.label}>
            <Body>
              <strong>{step.label}</strong> {formatDuration(step.ms)}
            </Body>
            <Description>{step.detail}</Description>
          </div>
        ))}
      </div>
      {airbag === null && (
        <Description>No IncidentDateTime in the crash data, the vehicle → cloud latency is not available.</Description>
      )}
    </Card>
  );
}

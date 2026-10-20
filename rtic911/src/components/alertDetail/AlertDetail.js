"use client";

import { Button } from "@via-ds/components/button";
import { Card } from "@via-ds/components/card";
import { Body, Description, H2, H3 } from "@via-ds/components/typography";
import ClaimCheck from "@/components/claimCheck/ClaimCheck";
import Latency from "@/components/latency/Latency";
import CrashMap from "@/components/crashMap/CrashMap";
import SeatMap from "@/components/seatMap/SeatMap";
import StatusPill from "@/components/statusPill/StatusPill";
import Sparkline from "@/components/timeSeries/Sparkline";
import { CVED_PATHS, INCIDENT_FIELDS, NOT_AVAILABLE_LABEL, OCCUPANT_FIELDS, TIME_SERIES } from "@/lib/const/cved.js";

function formatValue(value, { unit, decimals }) {
  if (value === null || value === undefined) return NOT_AVAILABLE_LABEL;
  const text = typeof value === "number" && decimals !== undefined ? value.toFixed(decimals) : String(value);
  return unit ? `${text} ${unit}` : text;
}

function FieldList({ fields, signals }) {
  return (
    <dl className="mt-2 flex flex-col gap-1">
      {fields.map((field) => (
        <div key={field.path} className="flex justify-between gap-2">
          <dt>
            <Description>{field.label}</Description>
          </dt>
          <dd>
            <Body>{formatValue(signals[field.path], field)}</Body>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AlertDetail({ alert, onAcknowledge }) {
  const isNew = alert.status === "new";
  const signals = alert.signals;
  // the contextual data arrives in the second message of the Crash Monitor Agent
  const hasContext = CVED_PATHS.occupantWeight in signals;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <H2>Automated crash notification</H2>
          <Description>
            Received {new Date(alert.receivedAt).toLocaleString()}
            {alert.repeatCount > 0 && ` · repeated ${alert.repeatCount}×, last ${new Date(alert.lastReceivedAt).toLocaleTimeString()}`}
          </Description>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={alert.status} />
          {isNew && (
            <Button variant="primary" onPress={() => onAcknowledge(alert._id)}>
              Acknowledge
            </Button>
          )}
        </div>
      </div>

      <CrashMap location={alert.location} />

      <Latency alert={alert} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card background="secondary" density="compact">
          <H3>Incident</H3>
          <FieldList fields={INCIDENT_FIELDS} signals={signals} />
        </Card>
        <ClaimCheck claim={signals[CVED_PATHS.claim]} plateNumber={signals[CVED_PATHS.plateNumber]} />
      </div>

      {!hasContext && <Description>Waiting for the contextual crash data…</Description>}
      {hasContext && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card background="secondary" density="compact">
            <H3>Occupant</H3>
            <FieldList fields={OCCUPANT_FIELDS} signals={signals} />
            <div className="mt-3">
              <SeatMap
                row={signals[CVED_PATHS.seatRow]}
                index={signals[CVED_PATHS.seatIndex]}
                rowTotal={signals[CVED_PATHS.rowTotal]}
                rowLayout={signals[CVED_PATHS.rowLayout]}
                occupantLabel={signals[CVED_PATHS.occupantName] || "Occupant 1"}
              />
            </div>
          </Card>
          <Card background="secondary" density="compact">
            <H3>Before the crash</H3>
            <Description>Last values reported by the vehicle, oldest first</Description>
            <div className="mt-3 flex flex-col gap-3">
              {TIME_SERIES.map((series) => (
                <Sparkline key={series.path} label={series.label} unit={series.unit} values={signals[series.path]} />
              ))}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

"use client";

import { Body, Description, H3 } from "@via-ds/components/typography";
import { Card } from "@via-ds/components/card";
import { NOT_AVAILABLE_LABEL } from "@/lib/const/cved.js";

// The claim identifies the vehicle that sent the emergency message. The Verifier is simulated:
// the claim is accepted when it names the license plate reported in the crash data.
export function verifyClaim(claim, plateNumber) {
  if (typeof claim !== "string" || !claim) return "missing";
  return plateNumber && claim.includes(String(plateNumber)) ? "verified" : "unverified";
}

// solid pills, same colors as the status pills
const RESULT = {
  verified: { icon: "✓", text: "Claim verified", background: "#00684A" },
  unverified: { icon: "!", text: "Claim not verified", background: "#DB3030" },
  missing: { icon: "–", text: "No claim received", background: "#5C6C75" },
};

export default function ClaimCheck({ claim, plateNumber }) {
  const result = RESULT[verifyClaim(claim, plateNumber)];
  return (
    <Card background="secondary" density="compact">
      <div className="flex items-center justify-between gap-2">
        <H3>Vehicle claim</H3>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white whitespace-nowrap"
          style={{ backgroundColor: result.background }}
        >
          <span aria-hidden="true">{result.icon}</span>
          {result.text}
        </span>
      </div>
      <Body>{claim || NOT_AVAILABLE_LABEL}</Body>
      <Description>Checked by the Verifier (simulated)</Description>
    </Card>
  );
}

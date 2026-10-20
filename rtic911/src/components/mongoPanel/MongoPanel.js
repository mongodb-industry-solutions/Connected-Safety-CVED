"use client";

import { Card } from "@via-ds/components/card";
import { Body, Code, Description, H3, InlineCode } from "@via-ds/components/typography";

const MONGODB_GREEN = "#00684A";

// The alert's data as stored in MongoDB Atlas: the crash document written by the VISSR cloud feeder
// (crashes) and the alert record RTIC 911 keeps for it (rtic_alerts).
export default function MongoPanel({ alert, crashContext }) {
  const alertRecord = {
    _id: alert._id,
    incidentId: alert.incidentId,
    status: alert.status,
    receivedAt: alert.receivedAt,
    ...(alert.acknowledgedAt && { acknowledgedAt: alert.acknowledgedAt }),
    crashTs: alert.crashTs,
    location: alert.location,
  };

  return (
    <Card background="secondary" density="compact">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MONGODB_GREEN }} aria-hidden="true" />
        <H3>Stored in MongoDB Atlas</H3>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Body>
          <strong>Crash document</strong> · <InlineCode>vissr_demo.crashes</InlineCode>
        </Body>
        <Description>Written by the VISSR cloud feeder (MongoDB sink): the CVED paths as a nested document, with typed values.</Description>
        <div className="mt-1 max-h-[32rem] overflow-auto">
          {crashContext?.error && <Body>Could not load the crash document: {crashContext.error}</Body>}
          {!crashContext?.error && crashContext && <Code>{JSON.stringify(crashContext, null, 2)}</Code>}
          {!crashContext && <Description>No crash document found.</Description>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <Body>
          <strong>Alert record</strong> · <InlineCode>vissr_demo.rtic_alerts</InlineCode>
        </Body>
        <Description>Kept by RTIC 911: status and acknowledgement, a GeoJSON location for geospatial queries, and the crash it refers to.</Description>
        <div className="mt-1 max-h-72 overflow-auto">
          <Code>{JSON.stringify(alertRecord, null, 2)}</Code>
        </div>
      </div>
    </Card>
  );
}

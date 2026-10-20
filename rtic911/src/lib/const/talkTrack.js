export const TALK_TRACK = [
  {
    heading: "Instructions and Talk Track",
    content: [
      {
        heading: "Solution Overview",
        body: "When an airbag deploys, the in-vehicle Crash Monitor Agent sends COVESA CVED crash data to a cloud VISSR server. Its feeder forwards the alert to this simulated RTIC 911 center and stores the crash in MongoDB, so dispatchers get location and occupant context before responders arrive.",
      },
      {
        heading: "How to Demo",
        body: [
          "Start the cloud VISSR server (docker/cloud) and this app (npm run dev, port 5050).",
          "Start the vehicle side with ./runAmmDemo.sh startme and wait for the simulated crash.",
          "The alert appears here with a map pin; open it to see occupant data and the crash document from MongoDB.",
          "Acknowledge the alert as the dispatcher.",
        ],
      },
    ],
  },
  {
    heading: "Behind the Scenes",
    content: [
      {
        heading: "Architecture Overview",
        body: "Vehicle VISSR server → Crash Monitor Agent → (VISS v3.2 multi-set over HTTP) → cloud VISSR server with the CVED tree → feeder → in parallel: POST /api/alerts on RTIC 911 and the crashes collection in MongoDB Atlas. RTIC stores its own alerts in rtic_alerts and retrieves the crash context from crashes.",
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "The document model fits VSS data",
        body: "The CVED tree is stored as-is: each VSS path becomes a nested field, so the crash document mirrors the specification with no schema mapping.",
      },
      {
        heading: "Geospatial out of the box",
        body: "Alerts carry a GeoJSON location with a 2dsphere index, ready for queries such as the nearest responders or hospitals.",
      },
    ],
  },
];

import { createHash } from "crypto";
import getMongoClientPromise from "@/integrations/mongodb/client.js";

export const ALERTS_COLLECTION = "rtic_alerts";

// The Crash Monitor Agent sends the crash data in two messages, the critical data and the contextual data,
// both carrying the same incident id, so they are merged into one alert. Crash data without an incident id
// (older Crash Monitor Agents re-send it while the airbag stays released) received within this window and
// radius, or identical crash data if there is no location, is treated as the same alert.
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_RADIUS_METERS = 500;
const EARTH_RADIUS_METERS = 6378100;

const NOT_AVAILABLE_PREFIX = "viss-inline:";
const INCIDENT_ID_PATH = "CVED.AutomatedCrashNotification.CrashIncident.IncidentID";
const LATITUDE_PATH = "CVED.AutomatedCrashNotification.CrashIncident.Location.Latitude";
const LONGITUDE_PATH = "CVED.AutomatedCrashNotification.CrashIncident.Location.Longitude";

let indexesPromise;

async function getAlertsCollection() {
  const client = await getMongoClientPromise();
  const collection = client.db(process.env.DATABASE_NAME).collection(ALERTS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ fingerprint: 1, lastReceivedAt: -1 }),
      collection.createIndex({ receivedAt: -1 }),
      collection.createIndex({ location: "2dsphere" }),
      collection.createIndex({ incidentId: 1 }),
    ]);
  }
  await indexesPromise;
  return collection;
}

/**
 * Validates an alert posted by the VISSR cloud feeder.
 * Expected shape: {"ts": "<RFC3339>", "data": [{"path": "CVED....", "value": "..."}]}
 * @param {unknown} payload - The parsed request body.
 * @returns {string|null} An error message, or null if the payload is valid.
 */
export function validateAlertPayload(payload) {
  if (!payload || typeof payload !== "object") return "body must be a JSON object";
  if (typeof payload.ts !== "string" || payload.ts.length === 0) return "ts must be a non-empty string";
  if (!Array.isArray(payload.data) || payload.data.length === 0) return "data must be a non-empty array";
  const isEveryPointValid = payload.data.every(
    (point) => point && typeof point.path === "string" && point.path.length > 0 && typeof point.value === "string"
  );
  return isEveryPointValid ? null : "every data point needs a string path and value";
}

/**
 * Converts a VISS string value to a typed value. VISS in-line errors such as
 * "viss-inline:Data-not-available" become null, and a time series such as '["118", "95", "75"]'
 * becomes an array of typed values.
 * @param {string} value - The value as received from VISSR.
 * @returns {number|boolean|string|null|Array} The typed value.
 */
export function toTypedValue(value) {
  if (value.startsWith(NOT_AVAILABLE_PREFIX)) return null;
  const series = parseTimeSeries(value);
  if (series) return series;
  if (value === "true" || value === "false") return value === "true";
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) ? number : value;
}

function parseTimeSeries(value) {
  if (!value.trim().startsWith("[")) return null;
  try {
    const parsed = JSON.parse(value.replaceAll('\\"', '"'));
    return Array.isArray(parsed) ? parsed.map((item) => toTypedValue(String(item))) : null;
  } catch {
    return null;
  }
}

/**
 * Computes a fingerprint of the crash data, independent of data point order and ts.
 * @param {{path: string, value: string}[]} data - The data points of the alert.
 * @returns {string} A hex encoded SHA-256 hash.
 */
export function fingerprintAlertData(data) {
  const sorted = [...data].sort((a, b) => a.path.localeCompare(b.path));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

/**
 * Builds the signal map and GeoJSON location stored with an alert.
 * @param {{path: string, value: string}[]} data - The data points of the alert.
 * @returns {{signals: Object<string, number|boolean|string|null>, location: Object|null}}
 */
export function buildAlertContent(data) {
  const signals = Object.fromEntries(data.map((point) => [point.path, toTypedValue(point.value)]));
  const latitude = signals[LATITUDE_PATH];
  const longitude = signals[LONGITUDE_PATH];
  const isLocationValid =
    typeof latitude === "number" && typeof longitude === "number" && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const location = isLocationValid ? { type: "Point", coordinates: [longitude, latitude] } : null;
  return { signals, location };
}

/**
 * Builds the filter that finds an earlier alert for the same crash: received within the duplicate
 * window and, if the alert has a location, within the duplicate radius, otherwise with identical data.
 * @param {string} fingerprint - The fingerprint of the alert data.
 * @param {Object|null} location - The GeoJSON location of the alert.
 * @param {Date} now - The time the alert was received.
 * @returns {Object} A MongoDB filter.
 */
export function buildDuplicateFilter(fingerprint, location, now) {
  const filter = { lastReceivedAt: { $gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } };
  if (location) {
    filter.location = {
      $geoWithin: { $centerSphere: [location.coordinates, DUPLICATE_RADIUS_METERS / EARTH_RADIUS_METERS] },
    };
  } else {
    filter.fingerprint = fingerprint;
  }
  return filter;
}

/**
 * Stores an alert from the VISSR cloud feeder. A message with the incident id of an existing alert
 * adds its signals to that alert. Without an incident id, a repeat of the same crash within the duplicate
 * window and radius updates the existing alert with the latest data instead of creating a new one.
 * The crash ts is kept in crashTs, it is the _id of the matching document in the crashes collection.
 * @param {{ts: string, data: {path: string, value: string}[]}} payload - A validated alert payload.
 * @returns {Promise<{alertId: string, isNew: boolean}>}
 */
export async function receiveAlert(payload) {
  const collection = await getAlertsCollection();
  const now = new Date();
  const fingerprint = fingerprintAlertData(payload.data);
  const { signals, location } = buildAlertContent(payload.data);
  const incidentId = signals[INCIDENT_ID_PATH] ?? null;

  if (incidentId !== null) {
    const incident = await collection.findOne({ incidentId }, { projection: { signals: 1 } });
    if (incident) {
      await collection.updateOne(
        { _id: incident._id },
        {
          $set: { lastReceivedAt: now, signals: { ...incident.signals, ...signals }, ...(location && { location }) },
          $inc: { messageCount: 1 },
          $addToSet: { crashTs: payload.ts },
        }
      );
      return { alertId: incident._id.toString(), isNew: false };
    }
  }

  const existing = incidentId !== null ? null : await collection.findOneAndUpdate(
    buildDuplicateFilter(fingerprint, location, now),
    {
      $set: { lastReceivedAt: now, fingerprint, signals, ...(location && { location }) },
      $inc: { repeatCount: 1 },
      $addToSet: { crashTs: payload.ts },
    },
    { sort: { lastReceivedAt: -1 }, projection: { _id: 1 } }
  );
  if (existing) return { alertId: existing._id.toString(), isNew: false };

  const result = await collection.insertOne({
    status: "new",
    receivedAt: now,
    lastReceivedAt: now,
    repeatCount: 0,
    messageCount: 1,
    incidentId,
    crashTs: [payload.ts],
    fingerprint,
    signals,
    location,
  });
  return { alertId: result.insertedId.toString(), isNew: true };
}

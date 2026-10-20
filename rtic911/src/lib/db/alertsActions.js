"use server";

import { ObjectId } from "mongodb";
import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { ALERTS_COLLECTION } from "@/lib/db/alerts.js";

const CRASHES_COLLECTION = "crashes";
const RECENT_ALERTS_LIMIT = 50;

async function getDb() {
  const client = await getMongoClientPromise();
  return client.db(process.env.DATABASE_NAME);
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Fetches the most recent crash alerts received by RTIC 911, newest first.
 * @returns {Promise<Object[]|{error: string}>} The alerts, or an error.
 */
export async function fetchRecentAlerts() {
  try {
    const db = await getDb();
    const alerts = await db
      .collection(ALERTS_COLLECTION)
      .find({}, { projection: { fingerprint: 0 } })
      .sort({ receivedAt: -1 })
      .limit(RECENT_ALERTS_LIMIT)
      .toArray();
    return toPlain(alerts);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetches the crash document the cloud feeder stored for an alert. This is the
 * additional context RTIC 911 retrieves from MongoDB after receiving the alert.
 * @param {string[]} crashTs - The crash timestamps of the alert (crash document _ids).
 * @returns {Promise<Object|null|{error: string}>} The latest matching crash document.
 */
export async function fetchCrashContext(crashTs) {
  try {
    const db = await getDb();
    const crash = await db
      .collection(CRASHES_COLLECTION)
      .find({ _id: { $in: crashTs } })
      .sort({ _id: -1 })
      .limit(1)
      .next();
    return toPlain(crash);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Marks an alert as acknowledged by the dispatcher.
 * @param {string} alertId - The alert _id.
 * @returns {Promise<{isUpdated: boolean}|{error: string}>}
 */
export async function acknowledgeAlert(alertId) {
  try {
    const db = await getDb();
    const result = await db
      .collection(ALERTS_COLLECTION)
      .updateOne({ _id: new ObjectId(alertId), status: "new" }, { $set: { status: "acknowledged", acknowledgedAt: new Date() } });
    return { isUpdated: result.modifiedCount === 1 };
  } catch (error) {
    return { error: error.message };
  }
}

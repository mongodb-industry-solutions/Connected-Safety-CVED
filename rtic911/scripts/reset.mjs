import "dotenv/config";
import getMongoClientPromise, { closeMongoClient } from "../src/integrations/mongodb/client.js";

// Clears the demo data before a run: the RTIC 911 alerts and the crash documents stored by the VISSR cloud feeder.
const DEMO_COLLECTIONS = ["rtic_alerts", "crashes"];

async function main() {
  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  for (const name of DEMO_COLLECTIONS) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    process.stdout.write(`[reset] ${process.env.DATABASE_NAME}.${name}: deleted ${deletedCount} documents\n`);
  }
  await closeMongoClient();
}

main().catch(async (error) => {
  process.stderr.write(`[reset] failed: ${error.message}\n`);
  await closeMongoClient();
  process.exit(1);
});

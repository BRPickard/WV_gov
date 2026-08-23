/**
 * Creates/updates Better Auth's tables from the live auth config, then applies
 * the application schema. Idempotent — `npm run dev` and `npm run start` call
 * it before booting Next.
 */
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth";
import { db } from "../lib/db"; // importing this applies lib/schema.sql

async function main() {
  const { runMigrations, toBeCreated, toBeAdded } = await getMigrations(auth.options);
  const pending = toBeCreated.length + toBeAdded.length;
  if (pending > 0) {
    await runMigrations();
    console.log(`Auth schema updated (${toBeCreated.length} table(s) created, ${toBeAdded.length} altered).`);
  } else {
    console.log("Auth schema already up to date.");
  }
  db.pragma("optimize");
  console.log("Application schema ready.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

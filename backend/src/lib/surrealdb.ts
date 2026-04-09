import { Surreal } from "surrealdb";

const SURREAL_URL =
  process.env.SURREAL_URL ||
  "wss://hackathon-06en6u8l4hvs35nil13p3msu4o.aws-euw1.surreal.cloud";
const SURREAL_USER = process.env.SURREAL_USER || "";
const SURREAL_PASS = process.env.SURREAL_PASS || "";
const SURREAL_NS = process.env.SURREAL_NS || "main";

/**
 * Get a SurrealDB connection scoped to a company's database.
 * Each company gets its own database within the namespace.
 */
export async function getCompanyDB(surrealDb: string): Promise<Surreal> {
  const db = new Surreal();
  await db.connect(SURREAL_URL, {
    namespace: SURREAL_NS,
    database: surrealDb,
    authentication: {
      username: SURREAL_USER,
      password: SURREAL_PASS,
    },
  });
  return db;
}

/**
 * Provision a new company database by applying the schema.
 */
export async function createCompanyDB(
  surrealDb: string,
  schema: string
): Promise<void> {
  const db = await getCompanyDB(surrealDb);
  try {
    await db.query(schema);
  } finally {
    await db.close();
  }
}

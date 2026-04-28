import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const globalForSql = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };
const client = globalForSql.__sql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForSql.__sql = client;

export const db = drizzle(client, { schema });
export { schema };

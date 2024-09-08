import * as schema from "@/schemas";

import { Config } from "drizzle-kit";
import { DrizzleConfig } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import env from "./environment";
import postgres from "postgres";

const credentials = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  port: env.DB_PORT,
};

const drizzleClientConfig: DrizzleConfig = { logger: true };

const connection = postgres(credentials);

const db = drizzle(connection, { schema, ...drizzleClientConfig });

export const config: Config = {
  schema: "./src/schemas/index.ts",
  out: "/drizzle",
  dialect: "postgresql",
  dbCredentials: credentials,
};

export default db;

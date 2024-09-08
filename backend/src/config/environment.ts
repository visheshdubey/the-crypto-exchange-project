import * as dotenv from "dotenv";

import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  PORT: z.coerce.number().default(8080),
  JWT_SECRET: z.string(),
  DB_URL: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_NAME: z.string(),
  DEV_DOMAIN: z.string().optional(),
  QA_DOMAIN: z.string().optional(),
  PROD_DOMAIN: z.string().optional(),
});

const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  DB_URL: process.env.DB_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_NAME: process.env.DB_NAME,
  DEV_DOMAIN: process.env.DEV_DOMAIN,
  QA_DOMAIN: process.env.QA_DOMAIN,
  PROD_DOMAIN: process.env.PROD_DOMAIN,
};

const env = envSchema.parse(envVars);

export type Environment = z.infer<typeof envSchema>;

export const validateEnv = envSchema.safeParse(envVars);

export default env;

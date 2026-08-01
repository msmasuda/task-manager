import { z } from "zod";

const runtimeSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(32),
  TOKEN_HASH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
});

export function checkRuntimeEnvironment() {
  return runtimeSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    TOKEN_HASH_SECRET: process.env.TOKEN_HASH_SECRET,
    APP_URL: process.env.APP_URL,
  });
}

import { z } from "zod";

const runtimeSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(32),
  TOKEN_HASH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
});

// Absolute URL for links in emails. Falls back to localhost only outside production,
// so a missing APP_URL fails loudly instead of mailing customers localhost links.
export function appUrl(path: string) {
  const base = process.env.APP_URL;
  if (!base && process.env.NODE_ENV === "production") throw new Error("APP_URLが設定されていません。");
  return `${base ?? "http://localhost:3000"}${path}`;
}

export function checkRuntimeEnvironment() {
  return runtimeSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    TOKEN_HASH_SECRET: process.env.TOKEN_HASH_SECRET,
    APP_URL: process.env.APP_URL,
  });
}

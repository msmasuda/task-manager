import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` does not connect to the database, so Vercel builds must
    // also be able to load this config before database variables are available.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});

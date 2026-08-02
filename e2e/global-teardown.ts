import "dotenv/config";
import { Client } from "pg";

export default async function globalTeardown() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    const users = await client.query<{ userId: string }>(`
      SELECT DISTINCT member."userId"
      FROM "OrganizationMember" member
      INNER JOIN "Organization" organization ON organization.id = member."organizationId"
      WHERE organization.slug LIKE 'e2e-%'
    `);
    await client.query(`DELETE FROM "Organization" WHERE slug LIKE 'e2e-%'`);
    if (users.rows.length > 0) {
      await client.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [users.rows.map(({ userId }) => userId)]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

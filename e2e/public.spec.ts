import { expect, test } from "@playwright/test";

test("ランディングページから登録画面へ移動できる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("予約も、担当も");
  await page.getByRole("link", { name: "無料で始める" }).click();
  await expect(page).toHaveURL(/\/signup/);
});

test("ヘルスチェックがDB接続状態を返す", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: "ok", checks: { environment: "ok", database: "ok" } });
});

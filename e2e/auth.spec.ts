import { expect, test } from "@playwright/test";

test("未認証ユーザーをログイン画面へ誘導する", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("企業登録、メール確認、ログインができる", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `owner-${unique}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("氏名").fill("E2E 管理者");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("企業名").fill("E2Eテスト企業");
  await page.getByLabel("企業URL用ID").fill(`e2e-${unique}`);
  await page.locator('input[name="password"]').fill("e2e-secure-password-123");
  await page.locator('input[name="passwordConfirmation"]').fill("e2e-secure-password-123");
  await page.getByRole("button", { name: "企業アカウントを作成" }).click();
  await expect(page.getByRole("heading", { name: "確認メールを送信しました" })).toBeVisible();
  const developmentUrl = await page.getByText(/\/verify-email\//).getAttribute("href");
  expect(developmentUrl).toBeTruthy();
  await page.goto(developmentUrl!);
  await page.getByRole("button", { name: "メールアドレスを確認" }).click();
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("e2e-secure-password-123");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("E2E 管理者").first()).toBeVisible();
});

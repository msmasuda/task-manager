import { describe, expect, it } from "vitest";
import { hashPassword, verifyPasswordOrDummy } from "./password";

describe("verifyPasswordOrDummy", () => {
  it("存在するユーザーのパスワードを検証する", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPasswordOrDummy(hash, "correct-password")).toBe(true);
    expect(await verifyPasswordOrDummy(hash, "wrong-password")).toBe(false);
  });

  it("ユーザーがいない場合もハッシュ検証を行い、常に失敗を返す", async () => {
    expect(await verifyPasswordOrDummy(undefined, "timing-equalizer")).toBe(false);
  });
});

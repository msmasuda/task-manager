import { describe, expect, it } from "vitest";
import { customerNoteSchema } from "./customer";

describe("顧客メモ", () => {
  it("2000文字以内のメモを受け付ける", () => {
    expect(customerNoteSchema.safeParse({ customerId: "customer-1", note: "あ".repeat(2000) }).success).toBe(true);
  });

  it("長すぎるメモを拒否する", () => {
    expect(customerNoteSchema.safeParse({ customerId: "customer-1", note: "あ".repeat(2001) }).success).toBe(false);
  });
});

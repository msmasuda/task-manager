import { createHmac, randomBytes } from "node:crypto";

function secret() {
  const value = process.env.TOKEN_HASH_SECRET;
  if (!value) throw new Error("TOKEN_HASH_SECRETが設定されていません。");
  return value;
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

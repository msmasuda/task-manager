import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRuntimeEnvironment } from "./environment";

describe("実行環境設定", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("必要な環境変数を検証する", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/app");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("TOKEN_HASH_SECRET", "b".repeat(32));
    vi.stubEnv("APP_URL", "https://example.com");
    expect(checkRuntimeEnvironment().success).toBe(true);
  });

  it("短い認証秘密値を拒否する", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/app");
    vi.stubEnv("AUTH_SECRET", "short");
    vi.stubEnv("TOKEN_HASH_SECRET", "b".repeat(32));
    vi.stubEnv("APP_URL", "https://example.com");
    expect(checkRuntimeEnvironment().success).toBe(false);
  });

  it("本番ではレート制限用Redisの設定を必須にする", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/app");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("TOKEN_HASH_SECRET", "b".repeat(32));
    vi.stubEnv("APP_URL", "https://example.com");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "");
    expect(checkRuntimeEnvironment().success).toBe(false);
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.example.com");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "token");
    expect(checkRuntimeEnvironment().success).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

function mockCounts(...counts: number[]) {
  const fetchMock = vi.fn(async () => Response.json(counts.flatMap((count) => [{ result: "OK" }, { result: count }])));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("rateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows everything when Redis is not configured", async () => {
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
    const fetchMock = mockCounts(999);
    expect(await rateLimit(["key", 1, 60])).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when any rule is over its limit", async () => {
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.example");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "token");
    mockCounts(3, 11);
    expect(await rateLimit(["ip", 10, 60], ["email", 10, 60])).toBe(false);
    mockCounts(10, 10);
    expect(await rateLimit(["ip", 10, 60], ["email", 10, 60])).toBe(true);
  });

  it("fails open when Redis is unreachable", async () => {
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.example");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await rateLimit(["ip", 1, 60])).toBe(true);
  });
});

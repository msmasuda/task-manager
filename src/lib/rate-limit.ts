import { headers } from "next/headers";

type Rule = [key: string, limit: number, windowSeconds: number];

// Fixed-window counters in Upstash Redis via its REST pipeline API. Returns false when any rule is exceeded.
// ponytail: fails open when Redis is unconfigured (local dev) or unreachable, so a Redis outage never locks out logins.
export async function rateLimit(...rules: Rule[]) {
  const url = process.env.RATE_LIMIT_REDIS_URL;
  const token = process.env.RATE_LIMIT_REDIS_TOKEN;
  if (!url || !token) return true;
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(rules.flatMap(([key, , windowSeconds]) => [["SET", `rl:${key}`, "0", "EX", String(windowSeconds), "NX"], ["INCR", `rl:${key}`]])),
      cache: "no-store",
    });
    if (!response.ok) return true;
    const results = (await response.json()) as Array<{ result?: number }>;
    return rules.every(([, limit], index) => (results[index * 2 + 1]?.result ?? 0) <= limit);
  } catch {
    return true;
  }
}

export async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

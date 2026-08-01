import { NextResponse } from "next/server";
import { checkRuntimeEnvironment } from "@/lib/config/environment";
import { db } from "@/lib/db/client";

export async function GET() {
  const environment = checkRuntimeEnvironment();
  if (!environment.success) {
    return NextResponse.json({ status: "error", checks: { environment: "failed", database: "skipped" }, timestamp: new Date().toISOString() }, { status: 503 });
  }
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", checks: { environment: "ok", database: "ok" }, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error", checks: { environment: "ok", database: "failed" }, timestamp: new Date().toISOString() }, { status: 503 });
  }
}

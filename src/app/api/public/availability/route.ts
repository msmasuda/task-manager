import { NextRequest, NextResponse } from "next/server";
import { findPublicAvailability } from "@/lib/availability/query";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const result = await findPublicAvailability({
    organizationSlug: query.get("organization") ?? "",
    locationSlug: query.get("location") ?? "",
    serviceId: query.get("service") ?? "",
    date: query.get("date") ?? "",
  });
  if (!result) return NextResponse.json({ error: "対象の店舗またはサービスが見つかりません。" }, { status: 404 });
  return NextResponse.json({
    service: { id: result.service.id, name: result.service.name, durationMinutes: result.service.durationMinutes },
    slots: result.slots.map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString(), availableStaffIds: slot.availableStaffIds })),
  });
}

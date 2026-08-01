import { getCurrentContext } from "@/lib/auth/context";
import { db } from "@/lib/db/client";

export async function getAppointmentAccessContext() {
  const context = await getCurrentContext();
  const locationIds = context.membership.role === "STAFF"
    ? (await db.locationMember.findMany({ where: { userId: context.membership.userId, location: { organizationId: context.organization.id } }, select: { locationId: true } })).map(({ locationId }) => locationId)
    : null;
  return { ...context, locationIds };
}

export async function requireAppointmentAccess(appointmentId: string) {
  const context = await getAppointmentAccessContext();
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, organizationId: context.organization.id, ...(context.locationIds ? { locationId: { in: context.locationIds } } : {}) },
  });
  if (!appointment) throw new Error("予約が見つからないか、アクセス権限がありません。");
  return { ...context, appointment };
}

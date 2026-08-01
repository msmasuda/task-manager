import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { db } from "@/lib/db/client";

export async function requireCustomerAccess(customerId: string) {
  const context = await getAppointmentAccessContext();
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: context.organization.id, ...(context.locationIds ? { appointments: { some: { locationId: { in: context.locationIds } } } } : {}) },
  });
  if (!customer) throw new Error("顧客が見つからないか、アクセス権限がありません。");
  return { ...context, customer };
}

import type { Prisma } from "../../../generated/prisma/client";
import type { AvailableSlot } from "@/lib/availability/engine";

type ReservableService = {
  organizationId: string;
  locationId: string;
  requiredStaffCount: number;
  resourceRequirements: Array<{ resourceTypeId: string; quantity: number }>;
};

// Replaces the appointment's staff assignments and resource reservations with ones for `slot`.
// The preferred staff member becomes PRIMARY when free in the new slot; otherwise staff are auto-assigned.
// Any existing reservation blocks a resource, matching the DB exclusion constraint that is the final guard.
export async function reserveSlot(tx: Prisma.TransactionClient, appointmentId: string, service: ReservableService, slot: AvailableSlot, options: { assignedById?: string; preferredUserId?: string | null } = {}) {
  const { assignedById, preferredUserId } = options;
  const occupancy = { occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd };
  const staffIds = [...slot.availableStaffIds].sort((a, b) => Number(b === preferredUserId) - Number(a === preferredUserId));
  await tx.appointmentAssignment.deleteMany({ where: { appointmentId } });
  await tx.resourceReservation.deleteMany({ where: { appointmentId } });
  await tx.appointmentAssignment.createMany({ data: staffIds.slice(0, service.requiredStaffCount).map((userId, index) => ({ appointmentId, userId, type: index ? "SUPPORT" : "PRIMARY", ...occupancy, assignedById })) });
  for (const requirement of service.resourceRequirements) {
    const resources = await tx.resource.findMany({ where: { organizationId: service.organizationId, locationId: service.locationId, resourceTypeId: requirement.resourceTypeId, isActive: true, reservations: { none: { appointmentId: { not: appointmentId }, occupancyStartAt: { lt: slot.occupancyEnd }, occupancyEndAt: { gt: slot.occupancyStart } } } }, orderBy: { id: "asc" }, take: requirement.quantity });
    if (resources.length < requirement.quantity) throw new Error("設備を確保できませんでした。");
    await tx.resourceReservation.createMany({ data: resources.map((resource) => ({ appointmentId, resourceId: resource.id, ...occupancy })) });
  }
}

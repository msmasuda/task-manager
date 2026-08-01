export type TimeWindow = { start: Date; end: Date };
export type StaffAvailability = { userId: string; windows: TimeWindow[]; unavailable: TimeWindow[] };
export type ResourceAvailability = { resourceId: string; unavailable: TimeWindow[] };
export type ResourcePool = { quantity: number; resources: ResourceAvailability[] };

export type AvailabilityInput = {
  openingWindows: TimeWindow[];
  staff: StaffAvailability[];
  resourcePools: ResourcePool[];
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  slotIntervalMinutes: number;
  requiredStaffCount: number;
  earliestStart?: Date;
};

export type AvailableSlot = {
  start: Date;
  end: Date;
  occupancyStart: Date;
  occupancyEnd: Date;
  availableStaffIds: string[];
};

function contains(window: TimeWindow, start: Date, end: Date) {
  return window.start <= start && window.end >= end;
}

function overlaps(window: TimeWindow, start: Date, end: Date) {
  return window.start < end && start < window.end;
}

export function generateAvailableSlots(input: AvailabilityInput): AvailableSlot[] {
  const durationMs = input.durationMinutes * 60_000;
  const beforeMs = input.bufferBeforeMinutes * 60_000;
  const afterMs = input.bufferAfterMinutes * 60_000;
  const intervalMs = input.slotIntervalMinutes * 60_000;
  const slots: AvailableSlot[] = [];

  for (const opening of input.openingWindows) {
    for (let startMs = opening.start.getTime(); startMs + durationMs <= opening.end.getTime(); startMs += intervalMs) {
      const start = new Date(startMs);
      const end = new Date(startMs + durationMs);
      const occupancyStart = new Date(startMs - beforeMs);
      const occupancyEnd = new Date(end.getTime() + afterMs);
      if (input.earliestStart && start < input.earliestStart) continue;
      if (!contains(opening, occupancyStart, occupancyEnd)) continue;

      const availableStaffIds = input.staff
        .filter((staff) => staff.windows.some((window) => contains(window, occupancyStart, occupancyEnd)))
        .filter((staff) => !staff.unavailable.some((window) => overlaps(window, occupancyStart, occupancyEnd)))
        .map((staff) => staff.userId);
      if (availableStaffIds.length < input.requiredStaffCount) continue;

      const resourcesAvailable = input.resourcePools.every((pool) => {
        const freeCount = pool.resources.filter((resource) => !resource.unavailable.some((window) => overlaps(window, occupancyStart, occupancyEnd))).length;
        return freeCount >= pool.quantity;
      });
      if (!resourcesAvailable) continue;
      slots.push({ start, end, occupancyStart, occupancyEnd, availableStaffIds });
    }
  }
  return slots;
}

import type { AppointmentStatus } from "../../../generated/prisma/client";

const transitions = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "COMPLETED", "NO_SHOW", "CANCELLED"],
  CHECKED_IN: ["IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  NO_SHOW: [],
} as const satisfies Record<AppointmentStatus, readonly AppointmentStatus[]>;

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus,
) {
  return transitions[from].includes(to as never);
}

export function getAllowedAppointmentTransitions(status: AppointmentStatus) {
  return [...transitions[status]] as AppointmentStatus[];
}

export function assertAppointmentTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
) {
  if (!canTransitionAppointment(from, to)) {
    throw new Error(`${from}から${to}へのステータス変更はできません。`);
  }
}

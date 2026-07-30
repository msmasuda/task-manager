import { z } from "zod";

const optionalTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const createAppointmentSchema = z
  .object({
    organizationId: z.string().cuid(),
    locationId: z.string().cuid(),
    serviceId: z.string().cuid(),
    customerId: z.string().cuid(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    source: z.enum(["WEB", "PHONE", "WALK_IN", "STAFF"]),
    preferredStaffId: z.string().cuid().optional(),
    customerNote: optionalTrimmedText(1000),
    internalNote: optionalTrimmedText(2000),
  })
  .refine(({ startAt, endAt }) => startAt < endAt, {
    message: "終了日時は開始日時より後にしてください。",
    path: ["endAt"],
  });

export type CreateAppointmentInput = z.infer<
  typeof createAppointmentSchema
>;

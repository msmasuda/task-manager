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

export const publicBookingSchema = z.object({
  organizationSlug: z.string().min(1),
  locationSlug: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1, "氏名を入力してください。").max(100),
  customerEmail: z.string().trim().email("メールアドレスを確認してください。").transform((value) => value.toLowerCase()),
  customerPhone: z.string().trim().max(30).optional().default(""),
  customerNote: optionalTrimmedText(1000),
});

export const staffBookingSchema = z.object({
  locationId: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(100),
  customerEmail: z.string().trim().email("メールアドレスを確認してください。").or(z.literal("")).transform((value) => value.toLowerCase()),
  customerPhone: z.string().trim().max(30).optional().default(""),
  source: z.enum(["PHONE", "WALK_IN", "STAFF"]),
  customerNote: optionalTrimmedText(1000),
  internalNote: optionalTrimmedText(2000),
});

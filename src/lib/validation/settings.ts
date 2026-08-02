import { z } from "zod";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "英小文字・数字・ハイフンで入力してください。");

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(1, "企業名を入力してください。"),
  slug,
  defaultTimeZone: z.string().trim().min(1),
});

export const locationSettingsSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "店舗名を入力してください。"),
  slug,
  timeZone: z.string().trim().min(1),
  email: z.string().trim().email("メールアドレスの形式が正しくありません。").or(z.literal("")),
  phone: z.string().trim().max(30).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  minLeadTimeMinutes: z.coerce.number().int().min(0).max(43_200),
  maxAdvanceDays: z.coerce.number().int().min(1).max(730),
  bookingEnabled: z.coerce.boolean().default(false),
  bookingMode: z.enum(["AUTO_CONFIRM", "MANUAL_CONFIRM"]),
});

const optionalPrice = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.coerce.number().int().min(0).max(100_000_000).optional(),
);

export const serviceSettingsSchema = z.object({
  id: z.string().optional(),
  locationId: z.string().min(1, "店舗を選択してください。"),
  name: z.string().trim().min(1, "サービス名を入力してください。").max(100),
  description: z.string().trim().max(1000).optional().default(""),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(1440),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(1440),
  priceAmount: optionalPrice,
  requiredStaffCount: z.coerce.number().int().min(1).max(20),
  color: z.enum(["blue", "green", "orange", "purple", "pink", "gray"]),
  isPublic: z.boolean(),
  isActive: z.boolean(),
});

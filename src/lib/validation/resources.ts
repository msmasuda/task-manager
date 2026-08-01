import { z } from "zod";

export const resourceTypeSchema = z.object({
  name: z.string().trim().min(1, "設備種別名を入力してください。").max(100),
});

export const resourceSchema = z.object({
  id: z.string().optional(),
  locationId: z.string().min(1, "店舗を選択してください。"),
  resourceTypeId: z.string().min(1, "設備種別を選択してください。"),
  name: z.string().trim().min(1, "設備名を入力してください。").max(100),
  isActive: z.boolean(),
});

export const serviceRequirementSchema = z.object({
  serviceId: z.string().min(1),
  resourceTypeId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
});

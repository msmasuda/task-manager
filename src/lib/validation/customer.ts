import { z } from "zod";

export const customerNoteSchema = z.object({
  customerId: z.string().min(1),
  note: z.string().trim().max(2000, "顧客メモは2000文字以内で入力してください。"),
});

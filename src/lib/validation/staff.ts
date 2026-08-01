import { z } from "zod";

export const inviteStaffSchema = z.object({
  email: z.string().trim().email("メールアドレスの形式が正しくありません。").transform((value) => value.toLowerCase()),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().trim().min(1, "氏名を入力してください。"),
    password: z.string().min(12, "パスワードは12文字以上で入力してください。").max(128),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "確認用パスワードが一致しません。",
    path: ["passwordConfirmation"],
  });

export const updateStaffSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
  isActive: z.boolean(),
  locationIds: z.array(z.string()),
  serviceIds: z.array(z.string()),
});

import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(12, "パスワードは12文字以上で入力してください。").max(128),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "確認用パスワードが一致しません。", path: ["passwordConfirmation"],
  });

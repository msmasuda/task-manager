import { z } from "zod";

const email = z
  .string()
  .trim()
  .email("メールアドレスの形式が正しくありません。")
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "パスワードを入力してください。"),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "氏名を入力してください。"),
    email,
    password: z
      .string()
      .min(12, "パスワードは12文字以上で入力してください。")
      .max(128, "パスワードは128文字以内で入力してください。"),
    passwordConfirmation: z.string(),
    organizationName: z.string().trim().min(1, "企業名を入力してください。"),
    organizationSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "英小文字・数字・ハイフンで入力してください。"),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "確認用パスワードが一致しません。",
    path: ["passwordConfirmation"],
  });

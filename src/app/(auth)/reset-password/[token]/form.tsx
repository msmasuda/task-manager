"use client";

import { useActionState } from "react";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, {});
  return <form action={action} className="form-stack"><input type="hidden" name="token" value={token} />{state.error && <p className="form-error">{state.error}</p>}<label>新しいパスワード<input name="password" type="password" minLength={12} autoComplete="new-password" required /><small>12文字以上</small></label><label>新しいパスワード（確認）<input name="passwordConfirmation" type="password" minLength={12} autoComplete="new-password" required /></label><button className="primary-button" type="submit" disabled={pending}>{pending ? "変更中…" : "パスワードを変更"}</button></form>;
}

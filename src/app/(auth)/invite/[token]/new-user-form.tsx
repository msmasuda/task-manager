"use client";

import { useActionState } from "react";
import { acceptAsNewUser } from "./actions";

export function NewUserForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptAsNewUser, {});
  return <form action={action} className="form-stack"><input type="hidden" name="token" value={token} />
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <label>氏名<input name="name" autoComplete="name" required /></label>
    <label>パスワード<input name="password" type="password" minLength={12} autoComplete="new-password" required /><small>12文字以上</small></label>
    <label>パスワード（確認）<input name="passwordConfirmation" type="password" minLength={12} autoComplete="new-password" required /></label>
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "承認中…" : "アカウントを作成して承認"}</button>
  </form>;
}

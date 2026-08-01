"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.complete) return <div className="form-success"><p>登録されている場合、再設定メールを送信しました。</p>{state.developmentUrl && <><p>開発用URL:</p><a href={state.developmentUrl}>{state.developmentUrl}</a></>}</div>;
  return <form action={action} className="form-stack"><label>メールアドレス<input name="email" type="email" autoComplete="email" required /></label><button className="primary-button" type="submit" disabled={pending}>{pending ? "送信中…" : "再設定メールを送る"}</button></form>;
}

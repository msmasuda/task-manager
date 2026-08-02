"use client";

import { useActionState } from "react";
import { resendVerification, type VerificationState } from "./actions";

export function VerificationForm({ defaultEmail, initialDevelopmentUrl }: { defaultEmail?: string; initialDevelopmentUrl?: string }) {
  const initialState: VerificationState = initialDevelopmentUrl ? { complete: true, developmentUrl: initialDevelopmentUrl } : {};
  const [state, action, pending] = useActionState(resendVerification, initialState);
  return <>{state.complete && <div className="form-success"><p>登録されている場合、確認メールを送信しました。</p>{state.developmentUrl && <><p>開発用URL:</p><a href={state.developmentUrl}>{state.developmentUrl}</a></>}</div>}<form action={action} className="form-stack"><label>メールアドレス<input name="email" type="email" defaultValue={defaultEmail} required /></label><button className="secondary-button" type="submit" disabled={pending}>{pending ? "送信中…" : "確認メールを再送"}</button></form></>;
}

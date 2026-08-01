"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState);
  return (
    <form action={action} className="form-stack">
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <label>氏名<input name="name" autoComplete="name" required /></label>
      <label>メールアドレス<input name="email" type="email" autoComplete="email" required /></label>
      <label>企業名<input name="organizationName" required /></label>
      <label>企業URL用ID<input name="organizationSlug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="example-company" required /><small>英小文字・数字・ハイフン</small></label>
      <label>パスワード<input name="password" type="password" minLength={12} autoComplete="new-password" required /><small>12文字以上</small></label>
      <label>パスワード（確認）<input name="passwordConfirmation" type="password" minLength={12} autoComplete="new-password" required /></label>
      <button className="primary-button" disabled={pending} type="submit">{pending ? "作成中…" : "企業アカウントを作成"}</button>
    </form>
  );
}

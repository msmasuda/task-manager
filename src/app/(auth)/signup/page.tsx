import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <p className="eyebrow">無料で開始</p>
      <h1>企業アカウントを作成</h1>
      <p className="lead auth-lead">最初のユーザーは企業のOWNERとして登録されます。</p>
      <SignupForm />
      <p className="auth-footer">登録済みの方は <Link href="/login">ログイン</Link></p>
    </>
  );
}

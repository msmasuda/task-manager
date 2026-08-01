import Link from "next/link";
import { ForgotPasswordForm } from "./form";

export default function ForgotPasswordPage() {
  return <><p className="eyebrow">アカウント</p><h1>パスワードを忘れた方</h1><p className="lead auth-lead">登録メールアドレスへ再設定リンクを送ります。</p><ForgotPasswordForm /><p className="auth-footer"><Link href="/login">ログインへ戻る</Link></p></>;
}

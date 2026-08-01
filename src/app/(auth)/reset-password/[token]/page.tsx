import { ResetPasswordForm } from "./form";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <><p className="eyebrow">アカウント</p><h1>パスワード再設定</h1><p className="lead auth-lead">新しいパスワードを入力してください。</p><ResetPasswordForm token={token} /></>;
}

import Link from "next/link";
import { VerificationForm } from "./form";

export default async function VerificationSentPage({ searchParams }: { searchParams: Promise<{ email?: string; developmentUrl?: string }> }) {
  const query = await searchParams;
  return <><p className="eyebrow">メール確認</p><h1>確認メールを送信しました</h1><p className="lead auth-lead">メール内のリンクを開くと登録が完了します。リンクは24時間有効です。</p><VerificationForm defaultEmail={query.email} initialDevelopmentUrl={query.developmentUrl} /><p className="auth-footer"><Link href="/login">ログインへ戻る</Link></p></>;
}

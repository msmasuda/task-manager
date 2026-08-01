import Link from "next/link";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { verifyEmail } from "./actions";

export default async function VerifyEmailPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const userToken = await db.userToken.findFirst({
    where: { tokenHash: hashToken(token), purpose: "EMAIL_VERIFICATION", usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!userToken) return <><h1>確認リンクを利用できません</h1><p className="lead auth-lead">期限切れ、使用済み、または無効なリンクです。</p><Link className="secondary-button" href="/verify-email/sent">確認メールを再送する</Link></>;

  return <><p className="eyebrow">メール確認</p><h1>メールアドレスを確認します</h1><p className="lead auth-lead">ボタンを押して登録を完了してください。</p>{error && <p className="form-error">確認処理に失敗しました。もう一度お試しください。</p>}<form action={verifyEmail}><input type="hidden" name="token" value={token} /><button className="primary-button" type="submit">メールアドレスを確認</button></form></>;
}

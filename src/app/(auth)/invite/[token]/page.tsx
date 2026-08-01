import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { acceptAsExistingUser } from "./actions";
import { NewUserForm } from "./new-user-form";

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const invitation = await db.organizationInvitation.findFirst({
    where: { tokenHash: hashToken(token) }, include: { organization: true },
  });
  const valid = invitation && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date();
  if (!valid) return <><h1>この招待は利用できません</h1><p className="lead auth-lead">期限切れ、取消済み、またはすでに承認されています。招待した管理者へ確認してください。</p><Link className="secondary-button" href="/login">ログインへ</Link></>;

  const [session, existingUser] = await Promise.all([auth(), db.user.findUnique({ where: { email: invitation.email }, select: { id: true } })]);
  const loggedInAsInvitee = session?.user.email?.toLowerCase() === invitation.email.toLowerCase();
  async function switchAccount() {
    "use server";
    await signOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}` });
  }
  return <><p className="eyebrow">スタッフ招待</p><h1>{invitation.organization.name}への招待</h1><p className="lead auth-lead">{invitation.email} が招待されています。</p>{error && <p className="form-error">{error}</p>}
    {existingUser ? loggedInAsInvitee ? <form action={acceptAsExistingUser}><input type="hidden" name="token" value={token} /><button className="primary-button" type="submit">招待を承認</button></form> : <><p className="lead auth-lead">このメールアドレスは登録済みです。対象アカウントでログインしてください。</p>{session ? <form action={switchAccount}><button className="primary-button" type="submit">アカウントを切り替える</button></form> : <Link className="primary-button" href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>ログインして承認</Link>}</> : <NewUserForm token={token} />}
  </>;
}

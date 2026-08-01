import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; reset?: string; verified?: string }>;
}) {
  if ((await auth())?.user) redirect("/app");
  const { error, callbackUrl, reset, verified } = await searchParams;
  const redirectTo = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/app";

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo,
      });
    } catch (cause) {
      if (cause instanceof AuthError) {
        const query = new URLSearchParams({ error: "credentials" });
        if (redirectTo !== "/app") query.set("callbackUrl", redirectTo);
        redirect(`/login?${query}`);
      }
      throw cause;
    }
  }

  return (
    <>
      <p className="eyebrow">スタッフ向け</p>
      <h1>ログイン</h1>
      <p className="lead auth-lead">予約・店舗管理画面へログインします。</p>
      {error && <p className="form-error" role="alert">メールアドレスまたはパスワードが正しくありません。</p>}
      {reset && <p className="form-success" role="status">パスワードを変更しました。新しいパスワードでログインしてください。</p>}
      {verified && <p className="form-success" role="status">メール確認が完了しました。ログインしてください。</p>}
      <form action={login} className="form-stack">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={redirectTo} />}
        <label>メールアドレス<input name="email" type="email" autoComplete="email" required /></label>
        <label>パスワード<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary-button" type="submit">ログイン</button>
      </form>
      <p className="auth-footer"><Link href="/forgot-password">パスワードを忘れた方</Link></p>
      <p className="auth-footer"><Link href="/verify-email/sent">確認メールを再送する</Link></p>
      <p className="auth-footer">初めて利用する方は <Link href="/signup">企業アカウントを作成</Link></p>
    </>
  );
}

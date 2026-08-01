import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-brand" href="/">
          Reservation Manager
        </Link>
        {children}
      </section>
    </main>
  );
}

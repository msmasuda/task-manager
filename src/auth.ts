import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!(await rateLimit([`login:ip:${await clientIp()}`, 30, 900], [`login:email:${hashToken(parsed.data.email)}`, 10, 900]))) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, name: true, email: true, passwordHash: true, emailVerifiedAt: true, sessionVersion: true },
        });
        if (!user || !user.emailVerifiedAt || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
          return null;
        }
        return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      } else if (token.sub) {
        const current = await db.user.findUnique({ where: { id: token.sub }, select: { sessionVersion: true } });
        if (!current || current.sessionVersion !== token.sessionVersion) {
          delete token.sub;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const DAY = 60 * 60 * 24;
const REMEMBER_TTL = 30 * DAY;
const SHORT_TTL = 4 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: REMEMBER_TTL },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        const remember = String(credentials?.remember ?? "true") !== "false";
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          remember,
        } as { id: string; email: string; name: string | null; remember: boolean };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; remember?: boolean };
        token.id = u.id;
        token.remember = u.remember !== false;
        const now = Math.floor(Date.now() / 1000);
        token.exp = now + (token.remember ? REMEMBER_TTL : SHORT_TTL);
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const isLogin = pathname === "/login";
      const isLoggedIn = !!auth?.user;
      if (isLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", request.url));
        return true;
      }
      return isLoggedIn;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { requireAuthSecret } from "@/lib/env";
import { type UserRole } from "@/types/user";
import { googleConfigured } from "@/lib/google-configured";

export type AppJWT = {
  id?: string;
  role?: string;
  verificationStatus?: string;
  username?: string | null;
  locale?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  tokenVersion?: number;
  lastRefresh?: number;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      verificationStatus: string;
      username?: string | null;
      locale?: string;
    };
  }

  interface User {
    role?: string;
    locale?: string;
  }
}



export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!identifier || !password) return null;

        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { profile: { username: identifier } }],
          },
          include: { profile: true },
        });
        if (!user?.passwordHash) return null;
        if (user.accountStatus !== "active") return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName ?? user.email,
          image: user.profile?.avatarUrl,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
          include: { profile: true },
        });
        if (existing && !existing.profile) {
          const username =
            user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20);
          await db.profile.create({
            data: {
              userId: existing.id,
              username,
              displayName: user.name ?? username,
              avatarUrl: user.image,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const t = token as typeof token & AppJWT;

      if (user?.id) {
        t.id = user.id;
        t.role = user.role ?? "user";
        t.locale = user.locale ?? "ar";
      }

      if (t.id) {
        const now = Date.now();
        const isFirstLogin = Boolean(user?.id);
        const isForced = trigger === "update" || trigger === "signUp";
        const isStale = !t.lastRefresh || now - t.lastRefresh > 60_000;

        if (isFirstLogin || isForced || isStale) {
          const dbUser = await db.user.findUnique({
            where: { id: t.id },
            include: {
              profile: true,
              verification: true,
            },
          });
          if (dbUser) {
            t.role = dbUser.role;
            t.locale = dbUser.locale;
            t.username = dbUser.profile?.username ?? null;
            t.verificationStatus = dbUser.verification?.status ?? "not_started";
            t.name = dbUser.profile?.displayName ?? t.name;
            t.picture = dbUser.profile?.avatarUrl ?? t.picture;
            t.email = dbUser.email;

            if ((t.tokenVersion ?? 0) < dbUser.tokenVersion) {
              t.tokenVersion = dbUser.tokenVersion;
              t.id = undefined;
              t.role = "user";
              t.verificationStatus = "not_started";
            } else {
              t.tokenVersion = dbUser.tokenVersion;
            }
            t.lastRefresh = now;
          }
        } else {
          // Lightweight revocation check — only hit the DB when we skipped the full refresh
          const current = await db.user.findUnique({
            where: { id: t.id },
            select: { tokenVersion: true },
          });
          if (current && (t.tokenVersion ?? 0) < current.tokenVersion) {
            t.tokenVersion = current.tokenVersion;
            t.id = undefined;
            t.role = "user";
            t.verificationStatus = "not_started";
          }
        }
      }

      if (trigger === "update" && session) {
        const s = session as { locale?: string };
        if (s.locale) t.locale = s.locale;
      }

      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & AppJWT;
      if (session.user && t.id) {
        session.user.id = t.id;
        session.user.role = (t.role as UserRole) ?? "user";
        session.user.verificationStatus = t.verificationStatus ?? "not_started";
        session.user.username = t.username;
        session.user.locale = t.locale;
        session.user.name = t.name;
        session.user.image = t.picture ?? undefined;
        session.user.email = (t.email as string) ?? session.user.email;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const base =
        user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") ||
        "user";
      let username = base.slice(0, 20);
      let i = 0;
      while (await db.profile.findUnique({ where: { username } })) {
        i += 1;
        username = `${base.slice(0, 16)}${i}`;
      }

      await db.profile.create({
        data: {
          userId: user.id,
          username,
          displayName: user.name ?? username,
          avatarUrl: user.image,
        },
      });

      await db.identityVerification.create({
        data: { userId: user.id, status: "not_started" },
      });
    },
  },
  trustHost: true,
  secret: requireAuthSecret(),
});

export { googleConfigured };

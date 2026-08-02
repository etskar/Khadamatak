import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { ROLE_PERMISSIONS, type UserRole } from "@/types/user";
import { ensureWalletForUser } from "@/server/finance/wallet-service";

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

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

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
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
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
          include: { profile: true, wallet: true },
        });
        if (existing && !existing.wallet) {
          const username =
            existing.profile?.username ??
            user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20);
          await ensureWalletForUser(existing.id, username);
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

          // Force logout / revoke: if the DB tokenVersion is newer, drop the token
          if ((t.tokenVersion ?? 0) < dbUser.tokenVersion) {
            t.tokenVersion = dbUser.tokenVersion;
            t.id = undefined;
            t.role = "user";
            t.verificationStatus = "not_started";
          } else {
            t.tokenVersion = dbUser.tokenVersion;
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

      await ensureWalletForUser(user.id, username);

      await db.bankingCapability.createMany({
        data: [
          "personal_iban",
          "virtual_card",
          "physical_card",
          "bank_withdrawal",
          "multi_currency",
          "intl_transfer",
        ].map((type) => ({
          userId: user.id!,
          type,
          status: "not_available",
        })),
      });
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});

export function getSessionPermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
}

export { googleConfigured };

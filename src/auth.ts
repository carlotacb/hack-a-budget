import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const isProduction = process.env.NODE_ENV === "production";
const authSecret =
  process.env.AUTH_SECRET ??
  (isProduction ? undefined : process.env.AUTH_SECRET_DEV);

if (isProduction && !authSecret) {
  throw new Error("AUTH_SECRET is required in production.");
}

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });

      if (
        !user?.passwordHash ||
        !(await compare(parsed.data.password, user.passwordHash))
      ) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  cookies: isProduction
    ? undefined
    : {
        sessionToken: {
          name: "budgethack.dev.session-token.v1",
        },
      },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, name: true, email: true },
        });
        token.role = dbUser?.role;
        token.name = dbUser?.name;
        token.email = dbUser?.email;
      }

      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }

      if (
        token.role === "HACKER" ||
        token.role === "ORGANIZER" ||
        token.role === "DIRECTOR" ||
        token.role === "ADMIN"
      ) {
        session.user.role = token.role;
      }

      return session;
    },
  },
});

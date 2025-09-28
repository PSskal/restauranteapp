import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // Resend temporalmente deshabilitado
    // Resend({
    //   server: process.env.EMAIL_SERVER!,
    //   from: process.env.EMAIL_FROM!,
    //   sendVerificationRequest,
    // }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: false,
  trustHost: true,
  callbacks: {
    async session({ session, token }) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});

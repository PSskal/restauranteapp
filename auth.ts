import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// import Resend from "next-auth/providers/resend";
// import { sendVerificationRequest } from "@/lib/authSendRequest";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  debug: true,
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: false, // Desactivar debug temporalmente
  trustHost: true,
  session: {
    strategy: "jwt", // Usar JWT en lugar de base de datos temporalmente
  },
  callbacks: {
    async signIn({ user }) {
      try {
        if (user.email && user.id) {
          // Usar upsert para crear o actualizar el usuario
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              id: user.id,
              name: user.name || null,
              image: user.image || null,
            },
            create: {
              id: user.id,
              email: user.email,
              name: user.name || null,
              image: user.image || null,
            },
          });
          console.log("User upserted in database:", user.email);
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Continuar con el login aunque falle la creación del usuario
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});


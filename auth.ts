import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Cachear role y orgId en el token (se actualiza en cada request o con trigger update)
      if (!token.orgId || trigger === "update") {
        try {
          const userOrgs = await prisma.organization.findMany({
            where: {
              OR: [
                { ownerId: token.id as string },
                {
                  memberships: {
                    some: {
                      userId: token.id as string,
                    },
                  },
                },
              ],
            },
            include: {
              memberships: {
                where: {
                  userId: token.id as string,
                },
                select: {
                  role: true,
                },
              },
            },
            take: 1,
          });

          const currentOrg = userOrgs[0];

          if (currentOrg) {
            const isOwner = currentOrg.ownerId === token.id;
            const userRole = isOwner
              ? Role.OWNER
              : currentOrg.memberships[0]?.role;

            token.orgId = currentOrg.id;
            token.role = userRole;
            token.isOwner = isOwner;
          }
        } catch (error) {
          console.error("Error loading user role in JWT:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.orgId = token.orgId as string | undefined;
        session.user.role = token.role as Role | undefined;
        session.user.isOwner = token.isOwner as boolean | undefined;
      }
      return session;
    },
  },
});

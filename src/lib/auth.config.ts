// src/lib/auth.config.ts
// Edge-compatible auth configuration (no Prisma adapter here)
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
    session: {
        strategy: "jwt",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: "/sign-in",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            const publicRoutes = ["/", "/sign-in", "/sign-up"];
            const isPublicRoute = publicRoutes.includes(pathname) ||
                pathname.startsWith("/api/auth");

            if (!isLoggedIn && !isPublicRoute) {
                return false; // Redirect to sign-in
            }

            if (isLoggedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
                return Response.redirect(new URL("/dashboard", nextUrl.origin));
            }

            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;

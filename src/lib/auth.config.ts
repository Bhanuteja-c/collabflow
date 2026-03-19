// src/lib/auth.config.ts
// Edge-compatible auth configuration with Google and Credentials providers
import type { NextAuthConfig } from "next-auth";
// import Google from "next-auth/providers/google"; // Commented for FOSS compliance
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authConfig = {
    // Trust the host in production (required for Auth.js v5)
    trustHost: true,
    session: {
        strategy: "jwt",
    },
    providers: [
        // Google OAuth — commented out for FOSS hackathon compliance
        // Google({
        //     clientId: process.env.GOOGLE_CLIENT_ID!,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Dynamic import to avoid Edge runtime issues
                const { prisma } = await import("./prisma");

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) {
                    return null;
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!passwordMatch) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    status: user.status as string,
                    bio: user.bio || undefined,
                    handle: user.handle || undefined,
                };
            },
        }),
    ],
    pages: {
        signIn: "/sign-in",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            const publicRoutes = ["/", "/sign-in", "/sign-up", "/explore"];
            const isPublicRoute = publicRoutes.includes(pathname) ||
                pathname.startsWith("/api/auth") ||
                pathname.startsWith("/api/register");

            if (!isLoggedIn && !isPublicRoute) {
                return false; // Redirect to sign-in
            }

            if (isLoggedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
                return Response.redirect(new URL("/dashboard", nextUrl.origin));
            }

            return true;
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id!;
                token.image = user.image ?? undefined;
                token.status = user.status || undefined;
                token.bio = user.bio || undefined;
                token.handle = user.handle || undefined;
            }
            if (trigger === "update" && session) {
                if (session.image !== undefined) token.image = session.image;
                if (session.status !== undefined) token.status = session.status;
                if (session.bio !== undefined) token.bio = session.bio;
                if (session.handle !== undefined) token.handle = session.handle;
                if (session.name !== undefined) token.name = session.name;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                if (token.image) session.user.image = token.image as string;
                if (token.status) session.user.status = token.status as string;
                if (token.bio) session.user.bio = token.bio as string;
                if (token.handle) session.user.handle = token.handle as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;

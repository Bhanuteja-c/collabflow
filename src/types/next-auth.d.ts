import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            status?: string
            bio?: string
            handle?: string
        } & DefaultSession["user"]
    }

    interface User {
        status?: string
        bio?: string
        handle?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        status?: string
        bio?: string
        handle?: string
    }
}

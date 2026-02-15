// src/app/api/register/route.ts
// API route for user registration with email/password
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = request.headers.get("x-forwarded-for") || "anonymous";
        const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.auth);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
            );
        }

        const { name, email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: name || email.split("@")[0],
                email,
                password: hashedPassword,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Failed to create account" },
            { status: 500 }
        );
    }
}

// src/app/layout.tsx — Root Layout with NextAuth
import type { Metadata } from "next";
import "./globals.css";
import "@/components/mentions/mention-styles.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

// Local fallback to avoid network font fetch during offline builds
const inter = { className: "font-sans" };

export const metadata: Metadata = {
  title: "CollabFlow - Real-time Collaboration for Modern Teams",
  description:
    "The all-in-one workspace where teams write, chat, and build together in real-time. Open-source collaboration platform.",
  keywords: ["collaboration", "real-time", "documents", "team chat", "kanban", "open-source"],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            themes={["light", "dark", "midnight", "forest", "sunset", "nord", "catppuccin"]}
            disableTransitionOnChange={false}
          >
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

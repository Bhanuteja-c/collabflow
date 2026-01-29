import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production deployment
  output: "standalone",

  // Disable image optimization (not needed for internal tool)
  images: {
    unoptimized: true,
  },

  // Allow external domains for images (user avatars etc)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Enable standalone output for production deployment
  output: 'standalone',

  // Disable image optimization for Azure
  images: {
    unoptimized: true,
  },

  // Server configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

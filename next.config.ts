import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production deployment
  output: "standalone",

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

  // Environment variables that are exposed to the browser
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;

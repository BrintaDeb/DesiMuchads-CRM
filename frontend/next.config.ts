import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    // All /api/v1/* requests are handled natively by Next.js serverless route handlers in app/api/v1/*
    // Each route handler transparently proxies to BACKEND_URL when available and falls back to
    // autonomous serverless mode with 0 downtime on Vercel.
    return [];
  },
};

export default nextConfig;

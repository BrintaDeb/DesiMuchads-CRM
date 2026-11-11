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
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    // On Vercel without an external backend, do not forward to dead localhost ports
    if (isVercel && !backendUrl) {
      return [];
    }

    const destination = backendUrl
      ? `${backendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "")}/api/v1/:path*`
      : "http://127.0.0.1:8000/api/v1/:path*";

    return [
      {
        source: "/api/v1/:path*",
        destination,
      },
    ];
  },
};

export default nextConfig;

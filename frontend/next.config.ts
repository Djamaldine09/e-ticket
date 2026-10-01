import type { NextConfig } from "next";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://e-ticket-8832.onrender.com"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "e-ticket-8832.onrender.com",
        pathname: "/api/uploads/**",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.flavortales.site",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/audio/:path*",
        destination: "http://localhost:8080/api/audio/:path*",
      },
    ];
  },
};

export default nextConfig;

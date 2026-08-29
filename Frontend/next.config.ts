import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  compress: true,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
import type { NextConfig } from "next";

const extraOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel handles the production output itself. Keep standalone for Docker/self-hosted builds.
  output: process.env.VERCEL ? undefined : "standalone",
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
    "*.localhost.run",
    ...extraOrigins,
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const extraOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core"],
};

export default nextConfig;

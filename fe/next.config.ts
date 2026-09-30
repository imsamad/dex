import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Token logos, referenced from the token metadata JSON
    remotePatterns: [
      new URL("https://raw.githubusercontent.com/imsamad/token_metadata_storage/**"),
    ],
  },
};

export default nextConfig;

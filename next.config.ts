import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unitedstates.github.io",
        pathname: "/images/congress/**",
      },
    ],
  },
};

export default nextConfig;

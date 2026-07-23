import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-37581592c5a045f3ad8b1881608a2769.r2.dev",
      },
      {
        protocol: "https",
        hostname: "whacky-website.s3-ap-southeast-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;

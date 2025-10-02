import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "localhost",
      "images.unsplash.com",
      "plus.unsplash.com",
      "res.cloudinary.com",
      "picsum.photos",
      "via.placeholder.com",
      "example.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

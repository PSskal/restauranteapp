import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Whitelist explícita de dominios permitidos. No usar hostname "**"
    // porque permite SSRF via /_next/image y exfiltración indirecta.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Vercel Blob (subida de imágenes desde la app)
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // Avatares de Google (Auth.js)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Avatares de GitHub (por si se añade el provider)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // Configurar límites para archivos
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

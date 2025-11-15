import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "PSskal | Sistema de Gestión para Restaurantes en Perú",
    template: "%s | PSskal",
  },
  description:
    "Sistema completo de gestión para restaurantes: menú digital con QR, punto de venta, gestión de pedidos, cocina y reportes. Optimiza tu negocio gastronómico.",
  keywords: [
    "sistema para restaurantes",
    "POS restaurante",
    "menú digital",
    "QR restaurante",
    "gestión de pedidos",
    "software gastronómico",
    "punto de venta",
    "restaurantes Perú",
  ],
  authors: [{ name: "PSskal" }],
  creator: "PSskal",
  publisher: "PSskal",
  openGraph: {
    title: "PSskal | Sistema de Gestión para Restaurantes en Perú",
    description:
      "Sistema completo de gestión para restaurantes: menú digital con QR, punto de venta, gestión de pedidos y reportes.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.psskal.com",
    siteName: "PSskal",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "PSskal Logo",
      },
    ],
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PSskal | Sistema de Gestión para Restaurantes",
    description:
      "Sistema completo de gestión para restaurantes con menú digital QR, POS y reportes.",
    images: ["/icon.png"],
    creator: "@PSskal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

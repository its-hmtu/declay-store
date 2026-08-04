import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from '@/components/ui/tooltip';

// Nike-inspired redesign: single grotesque sans family for both display and
// body copy (mirrors Helvetica Now Display/Text). Editorial serifs (Fraunces,
// Source Serif 4) dropped in favor of one bold, minimal sans across the site.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Mono — eyebrows, meta, nav, buttons
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// M-08: social traffic is the main channel — every shared link needs rich previews.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Declay Store",
  description: "Handcrafted figures made with love.",
  openGraph: {
    type: "website",
    siteName: "Declay Store",
    title: "Declay Store",
    description: "Handcrafted figures made with love.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display serif — editorial headlines (the refined serif lines)
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});

// Body serif — paragraph copy
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Grotesque sans — heavy display lines, the wordmark, UI labels
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
      className={`${fraunces.variable} ${sourceSerif4.variable} ${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}

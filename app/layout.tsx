import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://bigsignaltech.com"),
  title: { default: "Free Online Video Downloader | BigSignal Tools", template: "%s | BigSignal Tools" },
  description: "Fast, mobile-friendly online video downloader for public media you own or are authorized to save.",
  applicationName: "BigSignal Tools",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    siteName: "BigSignal Tools",
    title: "Free Online Video Downloader | BigSignal Tools",
    description: "Paste a media link, choose an available format, and save public content you are authorized to download.",
    url: "/video-downloader",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Video Downloader | BigSignal Tools",
    description: "Fast, clean media resolution from BigSignalTech.com.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6678675739964402"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

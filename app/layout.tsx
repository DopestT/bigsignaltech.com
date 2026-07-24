import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Big Signal Tech",
  description:
    "Big Signal Tech is a YouTube channel covering the tech that actually matters — reviews, explainers, and deep dives.",
  openGraph: {
    title: "Big Signal Tech",
    description: "A YouTube channel covering the tech that actually matters.",
    url: "https://bigsignaltech.com",
    siteName: "Big Signal Tech",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6678675739964402"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

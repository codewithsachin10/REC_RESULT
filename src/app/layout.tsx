import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "REC Portal - Results & Academic Dashboard",
  description: "Official student portal and academic dashboard for Rajalakshmi Engineering College (REC). View exam results, track performance analytics, raise queries, and get instant notifications.",
  keywords: "REC, Rajalakshmi Engineering College, REC Results, Student Portal, REC Dashboard",
  authors: [{ name: "REC Administration" }],
  openGraph: {
    title: "REC Portal - Results & Academic Dashboard",
    description: "Official student portal and academic dashboard for Rajalakshmi Engineering College (REC).",
    url: "https://rec.edu.in",
    siteName: "REC Portal",
    type: "website",
  },
};

import PresenceTracker from "@/components/presence-tracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <PresenceTracker />
        {children}
      </body>
    </html>
  );
}

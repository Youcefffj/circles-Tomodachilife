import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/AppShell";
import { SdkProvider } from "@/components/wallet/SdkProvider";
import { WalletProvider } from "@/components/wallet/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hatch — money grows little creatures",
  description:
    "A Circles miniapp where everyday CRC activity hatches and raises tiny pixel creatures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <WalletProvider>
          <SdkProvider>
            <AppShell>{children}</AppShell>
          </SdkProvider>
        </WalletProvider>
      </body>
    </html>
  );
}

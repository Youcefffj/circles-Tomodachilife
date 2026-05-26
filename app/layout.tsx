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

/**
 * Inline script that runs *before* React paints to read the species hint
 * cookie set by the home page on previous visits, and apply the matching
 * `data-species` to <html>. This eliminates the palette flash on returning
 * visits while keeping the route statically prerenderable.
 *
 * It's keyed off a tight allow-list of species, so a forged cookie can
 * only fall back to the default aqua palette.
 */
const speciesBootstrap = `(function(){try{
  var m = document.cookie.match(/(?:^|; )hatch_species=([a-z]+)/);
  if(!m) return;
  var s = m[1];
  if (s === 'aqua' || s === 'fire' || s === 'plante') {
    document.documentElement.dataset.species = s;
  }
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: speciesBootstrap }} />
      </head>
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

import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { palettes } from "@greetings/shared";
import "./globals.css";
import { LegalFooter } from "@/components/legal/footer";
import { Providers } from "@/components/providers";
import { publicAuthKey } from "@/server/lib/config";
import { siteConfig } from "@/lib/site-config";
import { CRYPTO_SUBTLE_POLYFILL_SCRIPT } from "@/lib/crypto-subtle-polyfill";
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "CherryQube",
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  alternates: {
    types: {
      "text/markdown": `${siteConfig.getBaseUrl()}/index.md`,
    },
  },
  other: {
    "ai-summary": siteConfig.aiSummary,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = siteConfig.getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: siteConfig.name,
        url: baseUrl,
        description: siteConfig.description,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: siteConfig.contacts.support,
          },
          {
            "@type": "ContactPoint",
            contactType: "general inquiries",
            email: siteConfig.contacts.general,
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": `${baseUrl}/#organization` },
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${figtree.variable}`}
      style={
        {
          "--paper": palettes.thanksgiving.paper,
          "--ink": palettes.thanksgiving.ink,
          "--accent": palettes.thanksgiving.oxblood,
        } as React.CSSProperties
      }
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: CRYPTO_SUBTLE_POLYFILL_SCRIPT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers publishableKey={publicAuthKey()}>
          {children}
          <LegalFooter />
        </Providers>
      </body>
    </html>
  );
}

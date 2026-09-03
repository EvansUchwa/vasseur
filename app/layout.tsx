import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteBehavior from "@/components/site-behavior";

export const viewport: Viewport = {
  themeColor: "#F7F4EE",
};

// Public origin used for absolute og:/twitter: URLs. Override at build time
// with SITE_URL=https://… when the real domain is live.
const SITE_URL = (process.env.SITE_URL || "https://couverture-vasseur.fr").replace(
  /\/+$/,
  "",
);
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Couverture Vasseur — Couvreur zingueur ardoisier à Angers",
  description:
    "Couvreur zingueur à Angers depuis 12 ans. Réfection de toiture en ardoise d'Anjou, recherche de fuite 7j/7, zinguerie, démoussage. RGE Qualibat, décennale AXA, 47 avis Google 4,9/5. Devis gratuit sous 48 h : 02 41 87 34 12.",
  openGraph: {
    title: "Couverture Vasseur — Couvreur zingueur ardoisier à Angers",
    description:
      "Couvreur zingueur à Angers depuis 12 ans. Réfection de toiture en ardoise d'Anjou, recherche de fuite 7j/7, zinguerie, démoussage. RGE Qualibat, décennale AXA. Devis gratuit sous 48 h.",
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Couverture Vasseur",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Couverture Vasseur — couvreur zingueur ardoisier à Angers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Couverture Vasseur — Couvreur zingueur ardoisier à Angers",
    description:
      "Couvreur zingueur à Angers : réfection de toiture en ardoise, recherche de fuite 7j/7, zinguerie, démoussage.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Same fonts as the maquettes: Archivo + Newsreader (Google Fonts). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteBehavior />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import SiteBehavior from "@/components/site-behavior";

export const metadata: Metadata = {
  title: "Couverture Vasseur — Couvreur zingueur ardoisier à Angers",
  description:
    "Couvreur zingueur à Angers depuis 12 ans. Réfection de toiture en ardoise d'Anjou, recherche de fuite 7j/7, zinguerie, démoussage. RGE Qualibat, décennale AXA, 47 avis Google 4,9/5. Devis gratuit sous 48 h : 02 41 87 34 12.",
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

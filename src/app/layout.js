import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  // Chaque vitrine remplace ces valeurs par celles de son restaurant ([enseigne]/layout.js)
  title: "Tchopi · Commandez chez vos restaurants",
  description: "Commandez en ligne chez vos restaurants et suivez votre livraison en temps réel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tchopi",
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import LayoutWrapper from '@/components/LayoutWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="application-name" content="Tchopi" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tchopi" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        <CartProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </CartProvider>
      </body>
    </html>
  );
}

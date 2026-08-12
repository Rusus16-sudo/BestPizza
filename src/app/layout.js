import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  title: "Best Pizza - Commandez vos pizzas en ligne",
  description: "Application de livraison rapide pour la pizzeria Best Pizza. Personnalisez votre pizza et suivez-la en temps réel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Best Pizza",
  },
};

export const viewport = {
  themeColor: "#ff5a5f",
};

import LayoutWrapper from '@/components/LayoutWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="application-name" content="Best Pizza" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Best Pizza" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ff5a5f" />
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

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Déja. — Prediction Markets",
  description: "AI-powered prediction market trading on Polymarket, inside Telegram. Synth finds the edge. You trade it.",
  openGraph: {
    title: "Déja. — You knew it all along.",
    description: "AI-powered prediction market trading on Polymarket, inside Telegram. Built with Synthdata Predictive Intelligence API.",
    siteName: "Déja.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Déja. — You knew it all along.",
    description: "AI-powered prediction market trading on Polymarket, inside Telegram.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="bg-bg text-ink antialiased font-sans font-light">
        {children}
      </body>
    </html>
  );
}

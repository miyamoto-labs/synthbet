import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynthBet — AI-Powered Crypto Predictions",
  description: "Bet on BTC/ETH/SOL using Synth's Monte Carlo predictions",
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
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="bg-bg text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

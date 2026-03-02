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
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="bg-tg-bg text-tg-text antialiased">
        {children}
      </body>
    </html>
  );
}

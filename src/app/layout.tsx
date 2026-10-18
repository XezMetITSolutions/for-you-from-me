import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "💖 A Magical Surprise for Gamze | From Julian Martin",
  description: "An unforgettable romantic interactive journey crafted with love by Julian Martin for Gamze.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Quicksand:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

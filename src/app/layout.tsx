import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MANTISSA — Private DeFi yield on Starknet",
  description: "Shield capital, deploy yield, keep the strategy private.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}


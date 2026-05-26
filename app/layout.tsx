import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agency Site Guard",
  description:
    "Catch silent website failures before your clients do with automated monitoring and proof-of-work reports."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}

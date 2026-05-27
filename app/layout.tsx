import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { isClerkFrontendReady } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "Maintly",
  description:
    "Catch silent website failures before your clients do with automated monitoring and proof-of-work reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = isClerkFrontendReady ? (
    <ClerkProvider afterSignOutUrl="/" appearance={{ baseTheme: dark }}>
      {children}
    </ClerkProvider>
  ) : (
    children
  );

  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background font-sans text-foreground antialiased">
        {content}
      </body>
    </html>
  );
}

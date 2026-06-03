import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { isClerkFrontendReady } from "@/lib/clerk";
import { PostHogProviderWrapper } from "@/components/posthog-provider";

export const metadata: Metadata = {
  title: {
    default: "Maintly - Website Care Plan Monitoring for Agencies",
    template: "%s | Maintly"
  },
  description: "Catch silent website failures before your clients do. Automated uptime, SSL, domain, tracking pixel, and form checks with premium white-label client PDF reports.",
  keywords: ["website monitoring", "care plans", "web agency", "uptime monitor", "white label reporting", "SSL checker", "form auditor", "SaaS care plan"],
  authors: [{ name: "Maintly Team" }],
  openGraph: {
    title: "Maintly - Catch Silent Website Failures Before Your Clients Do",
    description: "Automated uptime, SSL, domain, tracking pixel, and form checks with premium white-label client PDF reports.",
    url: "https://maintly.com",
    siteName: "Maintly",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maintly - Website Care Plan Monitoring for Agencies",
    description: "Catch silent website failures before your clients do. Automated checks & white-label reports.",
  },
  robots: {
    index: true,
    follow: true,
  }
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
        <PostHogProviderWrapper>
          {content}
        </PostHogProviderWrapper>
      </body>
    </html>
  );
}

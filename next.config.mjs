import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config) {
    if (process.env.MOCK_AUTH === 'true') {
      config.resolve.alias['@clerk/nextjs/server'] = path.resolve(__dirname, 'lib/clerk-mock/server.ts');
      config.resolve.alias['@clerk/nextjs'] = path.resolve(__dirname, 'lib/clerk-mock/index.tsx');
    }
    return config;
  },

  /**
   * Security headers applied to all routes.
   * C12 fix: Add CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.posthog.com https://app.posthog.com https://browser.sentry-cdn.com https://*.sentry.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.sentry.io https://ingest.sentry.io https://*.lemonsqueezy.com https://app.posthog.com",
              "frame-src https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.lemonsqueezy.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

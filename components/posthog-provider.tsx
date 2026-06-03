'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React, { useEffect } from 'react';

/**
 * PostHogProviderWrapper Client Component.
 * Initializes PostHog for telemetry analytics on route transition triggers
 * when the env key is configured, wrapping children elements.
 */
export function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    
    if (key && typeof window !== 'undefined') {
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: true, // Automate client router tracking
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

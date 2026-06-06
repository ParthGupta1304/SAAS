export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const clerkSecretKey = process.env.CLERK_SECRET_KEY;

export const isClerkFrontendReady = Boolean(clerkPublishableKey || process.env.MOCK_AUTH === 'true');
export const isClerkConfigured = Boolean((clerkPublishableKey && clerkSecretKey) || process.env.MOCK_AUTH === 'true');

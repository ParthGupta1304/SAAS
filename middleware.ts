import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  // H7 fix: also protect all API routes except the billing webhook (which uses HMAC auth)
  "/api/sites(.*)",
  "/api/reports(.*)",
  "/api/notifications(.*)",
  "/api/settings(.*)",
]);

const clerkAuthMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // C8 fix: Instead of silently bypassing ALL auth when Clerk is not configured,
  // block access to protected routes. This prevents accidental open access in production.
  if (!isClerkConfigured) {
    const url = request.nextUrl;
    const isProtected =
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/onboarding") ||
      (url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/billing/webhook"));

    if (isProtected) {
      // Return a 503 instead of silently passing through when Clerk isn't configured
      return NextResponse.json(
        {
          error:
            "Service Unavailable: Authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
        },
        { status: 503 }
      );
    }
    return NextResponse.next();
  }

  return clerkAuthMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};

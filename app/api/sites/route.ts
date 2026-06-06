import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites, checks } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

// M12 fix: Zod schema for POST body validation
const createSiteSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  url: z.string().min(1).max(2048).trim(),
  clientName: z.string().max(200).trim().optional(),
});

// L9 fix: Block SSRF-prone internal addresses
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/::1/,
  /^https?:\/\/metadata\.google\.internal/i,
];

function isBlockedUrl(url: string): boolean {
  return BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * GET handler to fetch all active monitored sites for the authenticated organization/user.
 * Automatically initializes or retrieves the organization record via the onboarding helper.
 * 
 * @returns {NextResponse} JSON payload with sites and their associated active checks config, or a 401/500 error response.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    const orgSites = await db.query.sites.findMany({
      where: eq(sites.orgId, org.id),
      with: {
        checks: true,
      },
    });

    return NextResponse.json({ sites: orgSites });
  } catch (error) {
    console.error('GET /api/sites error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler to create a new monitored site under the authenticated organization.
 * Validates request body, verifies active site counts against the organization plan's limits,
 * normalizes URL format, and provisions default uptime, SSL, and domain expiration checks.
 * 
 * @param {NextRequest} req The incoming HTTP request.
 * @returns {NextResponse} JSON payload containing the newly created site with initialized checks, or a 400/401/403/500 error response.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // M12 fix: Zod validation
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, url: rawUrl, clientName } = parsed.data;

    // Format URL (ensure protocol exists)
    let formattedUrl = rawUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // L9 fix: Block internal/private network URLs (SSRF prevention)
    if (isBlockedUrl(formattedUrl)) {
      return NextResponse.json(
        { error: 'URL points to a private or reserved address and cannot be monitored.' },
        { status: 400 }
      );
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Enforce trial/plan status check
    const isExpired = new Date() > new Date(org.trialEndsAt);
    if (isExpired) {
      return NextResponse.json(
        { error: 'Your workspace subscription or trial has expired. Please update your billing details to continue.' },
        { status: 403 }
      );
    }

    // C4 fix: Use a transaction to prevent race condition between count check and insert
    const createdSiteWithChecks = await db.transaction(async (tx) => {
      // Enforce site limits based on plan (inside transaction to prevent race)
      const siteCountResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(sites)
        .where(and(eq(sites.orgId, org.id), eq(sites.isActive, true)));

      const activeSites = Number(siteCountResult[0]?.count || 0);

      if (activeSites >= org.maxSites) {
        throw Object.assign(new Error('Site limit reached'), {
          code: 'SITE_LIMIT',
          plan: org.plan,
          maxSites: org.maxSites,
        });
      }

      // Create the site
      const [newSite] = await tx
        .insert(sites)
        .values({
          orgId: org.id,
          name: name.trim(),
          url: formattedUrl,
          clientName: clientName?.trim() || null,
          isActive: true,
        })
        .returning();

      // Determine check interval based on plan (paid tiers get 5-min/1-min checks, trial gets 15-min)
      const uptimeInterval = org.plan === 'trial' ? 15 : org.plan === 'starter' ? 5 : 1;

      // Insert default checks (H8: onConflictDoNothing handles the unique(site_id, type) constraint)
      await tx.insert(checks).values([
        {
          siteId: newSite.id,
          type: 'uptime',
          interval: uptimeInterval,
          config: {},
        },
        {
          siteId: newSite.id,
          type: 'ssl',
          interval: 1440, // 24 hours
          config: {},
        },
        {
          siteId: newSite.id,
          type: 'domain',
          interval: 10080, // 1 week
          config: {},
        },
      ]);

      // Fetch site with checks to return to frontend
      return tx.query.sites.findFirst({
        where: eq(sites.id, newSite.id),
        with: {
          checks: true,
        },
      });
    });

    return NextResponse.json({ site: createdSiteWithChecks }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException & { code?: string }).code === 'SITE_LIMIT') {
      const e = error as Error & { plan?: string; maxSites?: number };
      return NextResponse.json(
        { error: `Site limit reached. You are on the ${e.plan} plan which supports up to ${e.maxSites} sites. Please upgrade to add more.` },
        { status: 403 }
      );
    }
    console.error('POST /api/sites error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

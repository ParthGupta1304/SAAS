import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites, checks } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

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

    const body = await req.json();
    const { name, url, clientName } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    // Format URL (ensure protocol exists)
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Enforce site limits based on plan
    const siteCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sites)
      .where(and(eq(sites.orgId, org.id), eq(sites.isActive, true)));
    
    const activeSites = Number(siteCountResult[0]?.count || 0);

    // Enforce trial/plan status check
    const isExpired = new Date() > new Date(org.trialEndsAt);
    if (isExpired) {
      return NextResponse.json(
        { error: 'Your workspace subscription or trial has expired. Please update your billing details to continue.' },
        { status: 403 }
      );
    }

    if (activeSites >= org.maxSites) {
      return NextResponse.json(
        { error: `Site limit reached. You are on the ${org.plan} plan which supports up to ${org.maxSites} sites. Please upgrade to add more.` },
        { status: 403 }
      );
    }

    // Create the site
    const [newSite] = await db
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

    // Insert default checks
    await db.insert(checks).values([
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
    const createdSiteWithChecks = await db.query.sites.findFirst({
      where: eq(sites.id, newSite.id),
      with: {
        checks: true,
      },
    });

    return NextResponse.json({ site: createdSiteWithChecks }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sites error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

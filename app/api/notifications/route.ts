import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites, incidents } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

/**
 * GET /api/notifications
 * Retrieves the latest 15 incident notification events for the organization.
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
    });
    
    const siteIds = orgSites.map((s) => s.id);
    if (siteIds.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await db.query.incidents.findMany({
      where: inArray(incidents.siteId, siteIds),
      with: {
        site: true,
      },
      orderBy: [desc(incidents.createdAt)],
      limit: 15,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Marks alerts/incidents as read. Supports marking specific logs by IDs or marking all as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    const orgSites = await db.query.sites.findMany({
      where: eq(sites.orgId, org.id),
    });
    
    const siteIds = orgSites.map((s) => s.id);
    if (siteIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const body = await req.json();
    const { markAll, incidentIds } = body;

    let updatedRows = 0;
    if (markAll) {
      const result = await db
        .update(incidents)
        .set({ isRead: true })
        .where(
          and(
            inArray(incidents.siteId, siteIds),
            eq(incidents.isRead, false)
          )
        )
        .returning();
      updatedRows = result.length;
    } else if (Array.isArray(incidentIds) && incidentIds.length > 0) {
      const result = await db
        .update(incidents)
        .set({ isRead: true })
        .where(
          and(
            inArray(incidents.siteId, siteIds),
            inArray(incidents.id, incidentIds),
            eq(incidents.isRead, false)
          )
        )
        .returning();
      updatedRows = result.length;
    } else {
      return NextResponse.json({ error: 'Invalid parameters. Provide markAll or incidentIds array.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: updatedRows });
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

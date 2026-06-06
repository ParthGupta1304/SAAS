import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites, incidents } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { z } from 'zod';

// M17 fix: Zod schema for PATCH validation
const patchNotificationsSchema = z.union([
  z.object({ markAll: z.literal(true) }),
  z.object({
    markAll: z.literal(false).optional(),
    incidentIds: z
      .array(z.string().uuid('Each incidentId must be a valid UUID'))
      .min(1, 'At least one incidentId is required')
      .max(100, 'Cannot mark more than 100 incidents at once'),
  }),
]);

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
 * M17 fix: incidentIds are validated as UUIDs with array length limit.
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

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // M17 fix: Validate with zod
    const parsed = patchNotificationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { markAll } = parsed.data;
    const incidentIds = 'incidentIds' in parsed.data ? parsed.data.incidentIds : undefined;

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
    } else if (incidentIds && incidentIds.length > 0) {
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

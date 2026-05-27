import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { alertSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/settings/alerts
 * Retrieves all alert settings (Slack webhooks, target email lists) configured for the organization.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    const settings = await db.query.alertSettings.findMany({
      where: eq(alertSettings.orgId, org.id),
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET /api/settings/alerts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/settings/alerts
 * Configures or updates alert channels (e.g. configuring a Slack Webhook url or an Alert Email address).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { channel, config } = body;

    if (!channel || !config) {
      return NextResponse.json({ error: 'Channel and config are required' }, { status: 400 });
    }

    if (!['email', 'slack', 'sms'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Check if configuration already exists for this channel
    const existing = await db.query.alertSettings.findFirst({
      where: and(eq(alertSettings.orgId, org.id), eq(alertSettings.channel, channel)),
    });

    let result;
    if (existing) {
      [result] = await db
        .update(alertSettings)
        .set({ config })
        .where(eq(alertSettings.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(alertSettings)
        .values({
          orgId: org.id,
          channel,
          config,
        })
        .returning();
    }

    return NextResponse.json({ setting: result });
  } catch (error) {
    console.error('POST /api/settings/alerts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { alertSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// M12 + M14 fix: Strict per-channel config schemas to prevent arbitrary JSON injection
const emailConfigSchema = z.object({
  email: z.string().email('Must be a valid email address').max(254),
});

const slackConfigSchema = z.object({
  webhookUrl: z
    .string()
    .url('Must be a valid URL')
    .max(2048)
    .refine((url) => url.startsWith('https://hooks.slack.com/'), {
      message: 'Slack webhook URL must start with https://hooks.slack.com/',
    }),
});

const smsConfigSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format (e.g. +14155552671)')
    .max(20),
});

const CHANNEL_SCHEMAS = {
  email: emailConfigSchema,
  slack: slackConfigSchema,
  sms: smsConfigSchema,
} as const;

type AlertChannel = keyof typeof CHANNEL_SCHEMAS;

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
 * C4 fix: Wraps read+upsert in a transaction.
 * M14 fix: Validates config object strictly per channel type.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { channel, config } = body;

    if (!channel || !config) {
      return NextResponse.json({ error: 'Channel and config are required' }, { status: 400 });
    }

    if (!['email', 'slack', 'sms'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel type. Must be email, slack, or sms.' }, { status: 400 });
    }

    // M14 fix: Validate config strictly against the channel schema
    const channelSchema = CHANNEL_SCHEMAS[channel as AlertChannel];
    const configParsed = channelSchema.safeParse(config);
    if (!configParsed.success) {
      return NextResponse.json(
        { error: 'Invalid config for channel', details: configParsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // C4 fix: Use transaction for read-then-write upsert to prevent TOCTOU race
    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.alertSettings.findFirst({
        where: and(eq(alertSettings.orgId, org.id), eq(alertSettings.channel, channel)),
      });

      if (existing) {
        const [updated] = await tx
          .update(alertSettings)
          .set({ config: configParsed.data })
          .where(eq(alertSettings.id, existing.id))
          .returning();
        return updated;
      } else {
        const [inserted] = await tx
          .insert(alertSettings)
          .values({
            orgId: org.id,
            channel,
            config: configParsed.data,
          })
          .returning();
        return inserted;
      }
    });

    return NextResponse.json({ setting: result });
  } catch (error) {
    console.error('POST /api/settings/alerts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Helper to determine limits based on plan name
function getPlanLimits(plan: string) {
  switch (plan.toLowerCase()) {
    case 'starter':
      return { maxSites: 10, formChecksEnabled: false, isWhiteLabel: false };
    case 'growth':
      return { maxSites: 50, formChecksEnabled: true, isWhiteLabel: false };
    case 'agency':
      return { maxSites: 150, formChecksEnabled: true, isWhiteLabel: true };
    case 'scale':
      return { maxSites: 400, formChecksEnabled: true, isWhiteLabel: true };
    default: // fallback to free trial limits
      return { maxSites: 3, formChecksEnabled: false, isWhiteLabel: false };
  }
}

/**
 * POST handler for Lemon Squeezy webhook events.
 * Synchronizes subscription states, plan tiers, site limits, and features.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

    if (!secret) {
      console.error('[Billing Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not configured in .env');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 1. Verify Signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    const digestBuffer = Buffer.from(digest, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (
      digestBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    ) {
      console.warn('[Billing Webhook] Invalid webhook signature detected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const data = payload.data;

    console.log(`[Billing Webhook] Processing event: ${eventName} for subscription ID: ${data?.id}`);

    if (!data) {
      return NextResponse.json({ error: 'No data payload found' }, { status: 400 });
    }

    // Retrieve organization ID from checkout custom_data
    const customData = data.attributes?.custom_data || {};
    const orgId = customData.orgId || customData.organizationId;
    const plan = customData.plan || 'starter'; // Default to starter if not passed

    if (!orgId) {
      console.warn('[Billing Webhook] Custom data is missing orgId, cannot map subscription:', customData);
      return NextResponse.json({ error: 'Missing organization ID custom data' }, { status: 400 });
    }

    // Fetch the target organization
    const orgList = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (orgList.length === 0) {
      console.error(`[Billing Webhook] Organization with ID ${orgId} not found in database`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const org = orgList[0];

    // Compute limits
    const limits = getPlanLimits(plan);

    // 2. Handle specific subscription events
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const status = data.attributes?.status; // e.g. 'active', 'trialing', 'on_hold', 'past_due', 'cancelled'
      
      const updateData: Partial<typeof organizations.$inferInsert> = {
        stripeSubscriptionId: String(data.id),
      };

      if (status === 'active' || status === 'trialing') {
        updateData.plan = plan.toLowerCase() as 'trial' | 'starter' | 'growth' | 'agency' | 'scale';
        updateData.maxSites = limits.maxSites;
        updateData.formChecksEnabled = limits.formChecksEnabled;
        updateData.isWhiteLabel = limits.isWhiteLabel;
        
        // Handle trial end timestamp if trialing
        const lsTrialEndsAt = data.attributes?.trial_ends_at;
        if (status === 'trialing' && lsTrialEndsAt) {
          updateData.trialEndsAt = new Date(lsTrialEndsAt);
        } else {
          // If active (paid), set trialEndsAt to current date so it is active
          updateData.trialEndsAt = new Date();
        }
      } else if (status === 'unpaid' || status === 'past_due') {
        // Payment failed or overdue, but don't delete yet. Downgrade features.
        // We will keep maxSites but turn off active check worker actions by setting plan to trial
        // and setting trialEndsAt to a past date (representing expired trialing).
        updateData.trialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired yesterday
      }

      await db.update(organizations).set(updateData).where(eq(organizations.id, org.id));
      console.log(`[Billing Webhook] Successfully updated plan to ${plan} for org: ${org.name}`);
    } 
    
    else if (eventName === 'subscription_cancelled') {
      // User cancelled subscription
      // We set trialEndsAt to the ends_at date (end of billing period), or current date if immediate.
      const endsAt = data.attributes?.ends_at;
      const expireDate = endsAt ? new Date(endsAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);

      await db
        .update(organizations)
        .set({
          trialEndsAt: expireDate,
        })
        .where(eq(organizations.id, org.id));
      
      console.log(`[Billing Webhook] Subscription cancelled for org: ${org.name}. Access expires on ${expireDate}`);
    } 
    
    else if (eventName === 'subscription_payment_failed') {
      // Direct payment failed hook. Mark trial as expired immediately to block checks.
      await db
        .update(organizations)
        .set({
          trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        })
        .where(eq(organizations.id, org.id));
      
      console.log(`[Billing Webhook] Payment failed for org: ${org.name}. Access suspended.`);
    }

    return NextResponse.json({ success: true, event: eventName });
  } catch (error) {
    console.error('[Billing Webhook] Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

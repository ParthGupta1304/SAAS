import 'dotenv/config';

import crypto from 'crypto';
import { db } from '../lib/db';
import { organizations } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const WEBHOOK_URL = 'http://localhost:3000/api/billing/webhook';
const SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || 'test_secret_key';

async function runTests() {
  console.log('🧪 Starting Lemon Squeezy webhook integration tests...');

  // 1. Fetch or create a test organization to map subscriptions to
  let org = await db.query.organizations.findFirst();
  if (!org) {
    console.log('No organization found. Creating a mock organization...');
    const [newOrg] = await db
      .insert(organizations)
      .values({
        clerkOrgId: 'org_test_12345',
        name: 'Mock Test Agency',
        plan: 'trial',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxSites: 3,
      })
      .returning();
    org = newOrg;
  }

  console.log(`Using organization: ${org.name} (${org.id})`);

  // Reset plan to trial before starting
  await db
    .update(organizations)
    .set({ plan: 'trial', maxSites: 3 })
    .where(eq(organizations.id, org.id));

  // 2. Define mock webhook payload for subscription_created
  const payload = {
    meta: {
      event_name: 'subscription_created',
    },
    data: {
      id: 'sub_ls_999888',
      type: 'subscriptions',
      attributes: {
        status: 'active',
        trial_ends_at: null,
        custom_data: {
          orgId: org.id,
          plan: 'growth', // upgrading to growth
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);

  // 3. Test A: POST with Valid Signature
  console.log('\n--- Test A: Valid Webhook Signature (Plan Upgrade) ---');
  const validHmac = crypto.createHmac('sha256', SECRET);
  const validSignature = validHmac.update(rawBody).digest('hex');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': validSignature,
      },
      body: rawBody,
    });

    const resData = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Response:', resData);

    // Verify DB update
    const updatedOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, org.id),
    });

    if (updatedOrg?.plan === 'growth' && updatedOrg.maxSites === 50) {
      console.log('✅ PASS: Organization plan updated successfully to Growth (50 sites limit)');
    } else {
      console.error(`❌ FAIL: Expected plan = growth (50 sites), got plan = ${updatedOrg?.plan} (${updatedOrg?.maxSites} sites)`);
    }
  } catch (error) {
    console.error('❌ FAIL: Request error during Test A:', error);
  }

  // 4. Test B: POST with Invalid Signature (Security Verification)
  console.log('\n--- Test B: Invalid Webhook Signature (Security Check) ---');
  const invalidSignature = 'invalid_signature_hash_here';

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': invalidSignature,
      },
      body: rawBody,
    });

    const resData = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Response:', resData);

    if (res.status === 400) {
      console.log('✅ PASS: Webhook rejected the fake signature with 400 Bad Request');
    } else {
      console.error(`❌ FAIL: Expected status 400, got ${res.status}`);
    }
  } catch (error) {
    console.error('❌ FAIL: Request error during Test B:', error);
  }

  // 5. Test C: Subscription Cancelled (Downgrade Grace Period)
  console.log('\n--- Test C: Subscription Cancelled (Expires in future) ---');
  const cancelPayload = {
    meta: {
      event_name: 'subscription_cancelled',
    },
    data: {
      id: 'sub_ls_999888',
      type: 'subscriptions',
      attributes: {
        status: 'cancelled',
        ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // expires in 5 days
        custom_data: {
          orgId: org.id,
        },
      },
    },
  };

  const cancelRawBody = JSON.stringify(cancelPayload);
  const cancelHmac = crypto.createHmac('sha256', SECRET);
  const cancelSignature = cancelHmac.update(cancelRawBody).digest('hex');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': cancelSignature,
      },
      body: cancelRawBody,
    });

    const resData = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Response:', resData);

    // Verify DB update
    const updatedOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, org.id),
    });

    const timeDiff = Math.abs(new Date(updatedOrg?.trialEndsAt!).getTime() - new Date(cancelPayload.data.attributes.ends_at).getTime());
    if (timeDiff < 10000) { // check if dates are close
      console.log('✅ PASS: Cancel expiry grace period set correctly in trialEndsAt');
    } else {
      console.error(`❌ FAIL: Expiry mismatch. Expected ${cancelPayload.data.attributes.ends_at}, got ${updatedOrg?.trialEndsAt}`);
    }
  } catch (error) {
    console.error('❌ FAIL: Request error during Test C:', error);
  }
}

runTests();

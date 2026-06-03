import 'dotenv/config';

console.log('DEBUG: DATABASE_URL =', process.env.DATABASE_URL);

import { db } from '../lib/db';
import { organizations, sites, checks } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

async function runPrunerTest() {
  console.log('🧪 Starting GDPR 7-day data pruner cascade integration test...');

  try {
    // 1. Create a mock expired organization (expired 10 days ago)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    console.log('Creating expired organization...');
    const [expiredOrg] = await db
      .insert(organizations)
      .values({
        clerkOrgId: `org_expired_test_${Date.now()}`,
        name: 'Expired Test Agency LLC',
        plan: 'trial',
        trialEndsAt: tenDaysAgo, // expired 10 days ago (> 7 days)
        maxSites: 3,
      })
      .returning();

    console.log(`Created organization: ${expiredOrg.name} (${expiredOrg.id}), expired on: ${expiredOrg.trialEndsAt}`);

    // 2. Add a site under this organization
    console.log('Adding site under expired organization...');
    const [expiredSite] = await db
      .insert(sites)
      .values({
        orgId: expiredOrg.id,
        name: 'Prune Target Site',
        url: 'http://prune-target.test',
      })
      .returning();

    console.log(`Created site: ${expiredSite.name} (${expiredSite.id})`);

    // 3. Add a check under the site
    console.log('Adding check under site...');
    const [expiredCheck] = await db
      .insert(checks)
      .values({
        siteId: expiredSite.id,
        type: 'uptime',
        interval: 5,
      })
      .returning();

    console.log(`Created check: ${expiredCheck.type} (${expiredCheck.id})`);

    // 4. Verify they exist in database
    const orgCheck = await db.query.organizations.findFirst({ where: eq(organizations.id, expiredOrg.id) });
    const siteCheck = await db.query.sites.findFirst({ where: eq(sites.id, expiredSite.id) });
    const checkCheck = await db.query.checks.findFirst({ where: eq(checks.id, expiredCheck.id) });

    if (orgCheck && siteCheck && checkCheck) {
      console.log('✅ Setup verified: All records inserted successfully before pruning.');
    } else {
      throw new Error('Database setup failed: Records were not created');
    }

    // 5. Run the Pruning Query (same logic as server.ts daily cron)
    console.log('\nRunning the pruner query...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch orgs expired more than 7 days ago
    const toPrune = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(sql`${organizations.trialEndsAt} < ${sevenDaysAgo}`);

    console.log(`Pruner identified ${toPrune.length} orgs to prune. (Includes: ${expiredOrg.name})`);

    const hasOurOrg = toPrune.some(o => o.id === expiredOrg.id);
    if (!hasOurOrg) {
      throw new Error(`Pruner failed to identify our expired organization (${expiredOrg.id})`);
    }

    // Delete the identified orgs
    for (const org of toPrune) {
      if (org.id === expiredOrg.id) {
        console.log(`Deleting organization: ${org.name} (${org.id})`);
        await db.delete(organizations).where(eq(organizations.id, org.id));
      }
    }

    // 6. Verify CASCADE deletion
    console.log('\nVerifying cascade deletion results...');
    const prunedOrg = await db.query.organizations.findFirst({ where: eq(organizations.id, expiredOrg.id) });
    const prunedSite = await db.query.sites.findFirst({ where: eq(sites.id, expiredSite.id) });
    const prunedCheck = await db.query.checks.findFirst({ where: eq(checks.id, expiredCheck.id) });

    if (!prunedOrg) {
      console.log('✅ Success: Organization deleted.');
    } else {
      console.error('❌ Fail: Organization still exists.');
    }

    if (!prunedSite) {
      console.log('✅ Success: Site CASCADE deleted.');
    } else {
      console.error('❌ Fail: Site still exists.');
    }

    if (!prunedCheck) {
      console.log('✅ Success: Monitoring checks CASCADE deleted.');
    } else {
      console.error('❌ Fail: Check still exists.');
    }

    if (!prunedOrg && !prunedSite && !prunedCheck) {
      console.log('\n🎉 ALL GDPR CASCADE PRUNING TESTS PASSED!');
    } else {
      console.error('\n❌ GDPR CASCADE PRUNING TEST FAILED.');
    }

  } catch (error) {
    console.error('❌ GDPR Pruner Test Failed with error:', error);
  }
}

runPrunerTest();

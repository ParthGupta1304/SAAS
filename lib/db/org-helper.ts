import { db } from './index';
import { organizations } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Fetches an organization by its Clerk ID. If it does not exist,
 * it initializes a new organization with a 14-day free trial and a 3-site limit.
 * 
 * @param {string} clerkOrgId Clerk organization or user fallback identifier.
 * @param {string} orgName Optional workspace name to initialize.
 * @returns {Promise<Object>} The fetched or initialized organization row object.
 */
export async function getOrCreateOrg(clerkOrgId: string, orgName: string = 'Agency Workspace') {
  let org = await db.query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, clerkOrgId),
  });

  if (!org) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day free trial

    const [newOrg] = await db
      .insert(organizations)
      .values({
        clerkOrgId,
        name: orgName,
        plan: 'trial',
        trialEndsAt,
        isWhiteLabel: false,
        formChecksEnabled: false,
        maxSites: 3, // Free trial limit
      })
      .returning();

    org = newOrg;
  }

  return org;
}

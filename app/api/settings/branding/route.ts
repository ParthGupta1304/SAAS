import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST handler to update agency custom branding configurations (logoUrl, brandColor, customFooter).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { logoUrl, brandColor, customFooter } = body;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Update the organization row
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        logoUrl: logoUrl !== undefined ? logoUrl : org.logoUrl,
        brandColor: brandColor !== undefined ? brandColor : org.brandColor,
        customFooter: customFooter !== undefined ? customFooter : org.customFooter,
      })
      .where(eq(organizations.id, org.id))
      .returning();

    return NextResponse.json({ org: updatedOrg });
  } catch (error) {
    console.error('POST /api/settings/branding error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

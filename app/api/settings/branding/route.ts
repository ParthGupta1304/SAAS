import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// M15 fix: Sanitize and validate branding fields
// Reject javascript: URIs, data: URIs (XSS vectors), and oversized content
const brandingSchema = z.object({
  logoUrl: z
    .string()
    .max(2048)
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      'logoUrl must be an https:// or http:// URL'
    )
    .optional()
    .nullable(),
  brandColor: z
    .string()
    .max(50)
    .refine(
      (v) => !v || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v),
      'brandColor must be a valid hex color (e.g. #fff or #ffffff)'
    )
    .optional()
    .nullable(),
  customFooter: z
    .string()
    .max(500, 'customFooter must not exceed 500 characters')
    .optional()
    .nullable(),
});

// L12 fix: Simple check that the org has white-label enabled
function requiresWhiteLabel(org: { isWhiteLabel: boolean }): boolean {
  return org.isWhiteLabel;
}

/**
 * POST handler to update agency custom branding configurations (logoUrl, brandColor, customFooter).
 * M15 fix: All branding fields validated and sanitized before saving.
 * L12 fix: Check that org has white-label feature enabled.
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

    // M15 fix: Validate with zod schema
    const parsed = brandingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { logoUrl, brandColor, customFooter } = parsed.data;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // L12 fix: Restrict branding to white-label plans only
    if (!requiresWhiteLabel(org)) {
      return NextResponse.json(
        { error: 'White-label branding is available on Agency and Scale plans only.' },
        { status: 403 }
      );
    }

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

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// M12 fix: Zod schema for PATCH body
const patchSiteSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  url: z.string().min(1).max(2048).trim().optional(),
  clientName: z.string().max(200).trim().nullable().optional(),
  isActive: z.boolean().optional(),  // L10 fix: enforce boolean type
});

// L7 fix: UUID validation
const uuidSchema = z.string().uuid('Invalid site ID format');

// L9 fix: Block SSRF-prone internal addresses
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/::1/,
];

function isBlockedUrl(url: string): boolean {
  return BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * PATCH handler to update site configurations (name, url, clientName, isActive).
 * Verifies organization ownership of the site, normalizes the URL if updated,
 * and returns the updated site payload.
 * 
 * @param {NextRequest} req The incoming HTTP request.
 * @param {Object} context Route parameter context containing a Promise of params.
 * @param {Promise<{ id: string }>} context.params Dynamic route parameters containing the site ID.
 * @returns {NextResponse} JSON payload with the updated site, or a 401/404/500 error response.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;

    // L7 fix: Validate UUID format
    const idParsed = uuidSchema.safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    const id = idParsed.data;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // M12 fix: Validate body with zod
    const parsed = patchSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, url, clientName, isActive } = parsed.data;

    // L9 fix: Block SSRF if URL is being updated
    if (url) {
      let formattedCheckUrl = url;
      if (!/^https?:\/\//i.test(formattedCheckUrl)) {
        formattedCheckUrl = `https://${formattedCheckUrl}`;
      }
      if (isBlockedUrl(formattedCheckUrl)) {
        return NextResponse.json(
          { error: 'URL points to a private or reserved address and cannot be monitored.' },
          { status: 400 }
        );
      }
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch site first to ensure ownership
    const existingSite = await db.query.sites.findFirst({
      where: and(eq(sites.id, id), eq(sites.orgId, org.id)),
    });

    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Format URL if provided
    let formattedUrl = url;
    if (url && !/^https?:\/\//i.test(url.trim())) {
      formattedUrl = `https://${url.trim()}`;
    }

    // Update site
    const [updatedSite] = await db
      .update(sites)
      .set({
        name: name !== undefined ? name.trim() : existingSite.name,
        url: url !== undefined ? formattedUrl : existingSite.url,
        clientName: clientName !== undefined ? (clientName?.trim() || null) : existingSite.clientName,
        isActive: isActive !== undefined ? isActive : existingSite.isActive,
      })
      .where(and(eq(sites.id, id), eq(sites.orgId, org.id)))
      .returning();

    return NextResponse.json({ site: updatedSite });
  } catch (error) {
    console.error('PATCH /api/sites/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a monitored site from the portfolio.
 * Verifies organization ownership, then deletes the site.
 * Foreign key constraints on onDelete: 'cascade' automatically clean up associated
 * checks, checkResults, incidents, and reports.
 * 
 * @param {NextRequest} req The incoming HTTP request.
 * @param {Object} context Route parameter context containing a Promise of params.
 * @param {Promise<{ id: string }>} context.params Dynamic route parameters containing the site ID.
 * @returns {NextResponse} Success notification, or a 401/404/500 error response.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;

    // L7 fix: Validate UUID format
    const idParsed = uuidSchema.safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }
    const id = idParsed.data;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch site to verify ownership
    const existingSite = await db.query.sites.findFirst({
      where: and(eq(sites.id, id), eq(sites.orgId, org.id)),
    });

    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Delete the site (triggers cascade delete on checks, incidents, check_results, etc.)
    await db.delete(sites).where(and(eq(sites.id, id), eq(sites.orgId, org.id)));

    return NextResponse.json({ success: true, message: 'Site deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/sites/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

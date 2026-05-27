import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

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

    const { id } = await params;
    const body = await req.json();
    const { name, url, clientName, isActive } = body;

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

    const { id } = await params;
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

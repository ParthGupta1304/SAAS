import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { reports, sites } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getReportData } from '@/lib/reports/reports';
import { generateReportNarrative } from '@/lib/ai/gemini';
import { generatePdfBuffer } from '@/lib/reports/pdf-generator';
import { uploadPdf } from '@/lib/supabase';
import { z } from 'zod';

// M12 + M16 fix: Strict validation for report creation
const createReportSchema = z.object({
  siteId: z.string().uuid('siteId must be a valid UUID'),
  month: z.number().int().min(1, 'month must be 1-12').max(12, 'month must be 1-12'),
  year: z.number().int().min(2000, 'year must be >= 2000').max(2100, 'year must be <= 2100'),
});

/**
 * GET handler to fetch all reports for the authenticated organization.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch site IDs belonging to organization
    const orgSites = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.orgId, org.id));
    
    const siteIds = orgSites.map((s) => s.id);
    if (siteIds.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // Query reports joined with their sites
    const orgReports = await db.query.reports.findMany({
      where: inArray(reports.siteId, siteIds),
      with: {
        site: true,
      },
      orderBy: [desc(reports.createdAt)],
    });

    return NextResponse.json({ reports: orgReports });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler to generate a new report for a site.
 * C4 fix: Wraps the report existence check + insert in a transaction.
 * M16 fix: Validates month/year ranges with zod.
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

    // M12 + M16 fix: Validate with zod (coerce strings to numbers for month/year)
    const parsed = createReportSchema.safeParse({
      siteId: body.siteId,
      month: typeof body.month === 'string' ? parseInt(body.month, 10) : body.month,
      year: typeof body.year === 'string' ? parseInt(body.year, 10) : body.year,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { siteId, month, year } = parsed.data;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // 1. Verify site belongs to organization
    const siteList = await db
      .select()
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.orgId, org.id)))
      .limit(1);

    if (siteList.length === 0) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
    }
    const site = siteList[0];

    // 2. Aggregate metrics data
    const reportData = await getReportData(siteId, month, year);
    if (!reportData) {
      return NextResponse.json({ error: 'Failed to compile report metrics data' }, { status: 400 });
    }

    // 3. Generate AI summary
    const aiSummary = await generateReportNarrative(reportData);

    // 4. Generate PDF buffer
    const branding = {
      logoUrl: org.logoUrl,
      brandColor: org.brandColor,
      customFooter: org.customFooter,
      orgName: org.name,
    };
    const pdfBuffer = await generatePdfBuffer(reportData, aiSummary, branding);

    // 5. Upload PDF to Supabase Storage
    const filename = `report-${siteId}-${year}-${month}-${Date.now()}.pdf`;
    const pdfUrl = await uploadPdf(pdfBuffer, filename);

    // C4 fix: Wrap check + upsert in a transaction to prevent race conditions
    const savedReport = await db.transaction(async (tx) => {
      // 6. Check if report already exists for site + month + year
      const existingReports = await tx
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.siteId, siteId),
            eq(reports.month, month),
            eq(reports.year, year)
          )
        )
        .limit(1);

      if (existingReports.length > 0) {
        // If already sent, do not let overwrite automatically
        if (existingReports[0].status === 'sent') {
          throw Object.assign(new Error('Already sent'), { code: 'ALREADY_SENT' });
        }

        // Update existing draft
        const [updatedReport] = await tx
          .update(reports)
          .set({
            aiSummary,
            pdfUrl,
            status: 'draft',
            createdAt: new Date(),
          })
          .where(eq(reports.id, existingReports[0].id))
          .returning();
        
        return updatedReport;
      } else {
        // Insert new report
        const [insertedReport] = await tx
          .insert(reports)
          .values({
            siteId,
            month,
            year,
            aiSummary,
            pdfUrl,
            status: 'draft',
          })
          .returning();
        
        return insertedReport;
      }
    });

    // Return the report details with site joined
    const finalReport = {
      ...savedReport,
      site,
    };

    return NextResponse.json({ report: finalReport }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as Error & { code?: string }).code === 'ALREADY_SENT') {
      return NextResponse.json(
        { error: 'A report has already been sent to the admin for this month and site. Cannot overwrite.' },
        { status: 409 }
      );
    }
    console.error('POST /api/reports error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

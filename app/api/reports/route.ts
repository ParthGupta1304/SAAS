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
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { siteId, month, year } = body;

    if (!siteId || !month || !year) {
      return NextResponse.json({ error: 'siteId, month, and year are required' }, { status: 400 });
    }

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
    const reportData = await getReportData(siteId, Number(month), Number(year));
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

    // 6. Check if report already exists for site + month + year
    const existingReports = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.siteId, siteId),
          eq(reports.month, Number(month)),
          eq(reports.year, Number(year))
        )
      )
      .limit(1);

    let savedReport;

    if (existingReports.length > 0) {
      // If already sent, do not let overwrite automatically (require manual overrides/clones)
      if (existingReports[0].status === 'sent') {
        return NextResponse.json(
          { error: 'A report has already been sent to the admin for this month and site. Cannot overwrite.' },
          { status: 409 }
        );
      }

      // Update existing draft
      const [updatedReport] = await db
        .update(reports)
        .set({
          aiSummary,
          pdfUrl,
          status: 'draft',
          createdAt: new Date(),
        })
        .where(eq(reports.id, existingReports[0].id))
        .returning();
      
      savedReport = updatedReport;
    } else {
      // Insert new report
      const [insertedReport] = await db
        .insert(reports)
        .values({
          siteId,
          month: Number(month),
          year: Number(year),
          aiSummary,
          pdfUrl,
          status: 'draft',
        })
        .returning();
      
      savedReport = insertedReport;
    }

    // Return the report details with site joined
    const finalReport = {
      ...savedReport,
      site,
    };

    return NextResponse.json({ report: finalReport }, { status: 201 });
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

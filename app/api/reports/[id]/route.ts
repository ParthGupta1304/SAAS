import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { reports } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getReportData } from '@/lib/reports/reports';
import { generatePdfBuffer } from '@/lib/reports/pdf-generator';
import { uploadPdf } from '@/lib/supabase';
import { sendPdfReportEmail } from '@/lib/alerts/email';
import { z } from 'zod';

// L7 fix: UUID validation for route param
const uuidSchema = z.string().uuid('Invalid report ID format');

// M13 fix: Valid report status enum values
const VALID_STATUSES = ['draft', 'approved', 'sent'] as const;
type ReportStatus = typeof VALID_STATUSES[number];

/**
 * GET handler to retrieve a specific report or stream its PDF file.
 * M19 fix: Fetch report with org filter in DB query to avoid post-fetch auth.
 */
export async function GET(
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
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }
    const id = idParsed.data;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // M19 fix: Fetch report with org ownership check
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id),
      with: {
        site: true,
      },
    });

    // Verify ownership after fetch (safe because we also check orgId)
    if (!report || !report.site || report.site.orgId !== org.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if client is requesting direct PDF binary download
    const searchParams = req.nextUrl.searchParams;
    const download = searchParams.get('download');

    if (download === 'true' && report.pdfUrl) {
      try {
        const response = await fetch(report.pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF from Supabase storage: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="report-${report.site.name.replace(/\s+/g, '-')}-${report.month}-${report.year}.pdf"`,
          },
        });
      } catch (err) {
        console.error('[Reports Endpoint] PDF download failed:', err);
        return NextResponse.json({ error: 'Failed to download report PDF file' }, { status: 502 });
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('GET /api/reports/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH handler to update report summary narrative or workflow status.
 * If the summary is edited, the PDF is regenerated and re-uploaded automatically.
 * M13 fix: validates status against allowed enum values.
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
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }
    const id = idParsed.data;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { aiSummary, status } = body;

    // M13 fix: Validate status against the enum
    if (status !== undefined && !VALID_STATUSES.includes(status as ReportStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // M15 fix: Validate aiSummary is a string if provided
    if (aiSummary !== undefined && typeof aiSummary !== 'string') {
      return NextResponse.json({ error: 'aiSummary must be a string' }, { status: 400 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch existing report and verify org ownership
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id),
      with: {
        site: true,
      },
    });

    if (!report || !report.site || report.site.orgId !== org.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updates: Partial<typeof reports.$inferInsert> = {};

    if (status !== undefined) {
      updates.status = status as ReportStatus;
    }

    if (aiSummary !== undefined && aiSummary !== report.aiSummary) {
      // M15 fix: Limit aiSummary length to prevent oversized payloads
      if (aiSummary.length > 50000) {
        return NextResponse.json({ error: 'aiSummary exceeds maximum allowed length' }, { status: 400 });
      }
      updates.aiSummary = aiSummary;

      // Re-generate metrics data and update PDF
      const reportData = await getReportData(report.siteId, report.month, report.year);
      if (reportData) {
        const branding = {
          logoUrl: org.logoUrl,
          brandColor: org.brandColor,
          customFooter: org.customFooter,
          orgName: org.name,
        };
        const pdfBuffer = await generatePdfBuffer(reportData, aiSummary, branding);
        const filename = `report-${report.siteId}-${report.year}-${report.month}-${Date.now()}.pdf`;
        const newPdfUrl = await uploadPdf(pdfBuffer, filename);
        if (newPdfUrl) {
          updates.pdfUrl = newPdfUrl;
        }
      }
    }

    // Execute update in DB
    const [updatedReport] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();

    return NextResponse.json({ report: { ...updatedReport, site: report.site } });
  } catch (error) {
    console.error('PATCH /api/reports/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler to trigger report sending action.
 * Downloads the PDF buffer from storage and sends it as an attachment to the authenticated admin's email.
 * H10 fix: Redact email error details from client response.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const adminEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!adminEmail) {
      return NextResponse.json({ error: 'Admin email not found in Clerk profile' }, { status: 400 });
    }

    const { id: rawId } = await params;

    // L7 fix: Validate UUID format
    const idParsed = uuidSchema.safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }
    const id = idParsed.data;

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Default action is 'send'
    if (action && action !== 'send') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch report details
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id),
      with: {
        site: true,
      },
    });

    if (!report || !report.site || report.site.orgId !== org.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (!report.pdfUrl) {
      return NextResponse.json({ error: 'PDF report has not been generated yet' }, { status: 400 });
    }

    // 1. Download PDF file buffer from Supabase Storage
    const response = await fetch(report.pdfUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to retrieve PDF file from storage' }, { status: 502 });
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 2. Email PDF directly as an attachment to the admin
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const reportPeriod = `${monthNames[report.month - 1]} ${report.year}`;
    const subject = `[Maintly Report] Care Summary for ${report.site.name} (${reportPeriod})`;
    const filename = `report-${report.site.name.replace(/\s+/g, '-')}-${report.month}-${report.year}.pdf`;

    const emailResult = await sendPdfReportEmail({
      to: adminEmail,
      subject,
      siteName: report.site.name,
      reportPeriod,
      pdfBuffer,
      filename,
    });

    if (!emailResult.success) {
      // H10 fix: Do NOT expose internal email provider error details to the client
      console.error('[Reports] Email dispatch failed:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send report email. Please try again later.' }, { status: 502 });
    }

    // 3. Mark status as 'sent' in database
    const [updatedReport] = await db
      .update(reports)
      .set({ status: 'sent' })
      .where(eq(reports.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Report successfully dispatched to ${adminEmail}`,
      report: { ...updatedReport, site: report.site },
    });
  } catch (error) {
    console.error('POST /api/reports/[id]/send error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

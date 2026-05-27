import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { reports, sites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getReportData } from '@/lib/reports/reports';
import { generatePdfBuffer } from '@/lib/reports/pdf-generator';
import { uploadPdf } from '@/lib/supabase';
import { sendPdfReportEmail } from '@/lib/alerts/email';

/**
 * GET handler to retrieve a specific report or stream its PDF file.
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

    const { id } = await params;
    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch report and verify organization site ownership
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id),
      with: {
        site: true,
      },
    });

    if (!report || report.site.orgId !== org.id) {
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
    const { aiSummary, status } = body;

    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // Fetch existing report and verify org ownership
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id),
      with: {
        site: true,
      },
    });

    if (!report || report.site.orgId !== org.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updates: Partial<typeof reports.$inferInsert> = {};

    if (status !== undefined) {
      updates.status = status;
    }

    if (aiSummary !== undefined && aiSummary !== report.aiSummary) {
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

    const { id } = await params;
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

    if (!report || report.site.orgId !== org.id) {
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
      return NextResponse.json({ error: `Resend email failed: ${emailResult.error}` }, { status: 502 });
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

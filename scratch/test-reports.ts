process.env.RESEND_API_KEY = 're_mock_123';
import { generatePdfBuffer } from '../lib/reports/pdf-generator';
import { sendPdfReportEmail } from '../lib/alerts/email';
import { ReportMetrics } from '../lib/reports/reports';
import * as fs from 'fs';
import * as path from 'path';

async function runReportTest() {
  console.log('=== Starting PDF Report & Email Dispatch Test ===');

  // 1. Compile mock metrics
  const mockMetrics: ReportMetrics = {
    siteName: 'Acme Corporates',
    siteUrl: 'https://acmecorp.com',
    month: 5,
    year: 2026,
    totalChecks: 1450,
    uptimePercent: 99.87,
    incidentsCount: 2,
    incidentsResolvedCount: 2,
    sslExpiryDaysLeft: 42,
    domainExpiryDaysLeft: 120,
    trackingPixelStatus: {
      expected: ['Google Tag Manager (GTM)', 'Meta Pixel', 'Google Analytics (GA4)'],
      found: ['Google Tag Manager (GTM)', 'Google Analytics (GA4)'],
      missing: ['Meta Pixel'],
    },
    formCheckSuccessRate: 98.2,
    formCheckTotal: 60,
    incidentList: [
      {
        id: 'inc-1',
        issue: 'Uptime check failed (502 Bad Gateway)',
        severity: 'critical',
        createdAt: new Date(2026, 4, 12, 14, 0),
        resolvedAt: new Date(2026, 4, 12, 14, 12),
        durationMinutes: 12,
      },
      {
        id: 'inc-2',
        issue: 'Contact form check failed (Submission Timeout)',
        severity: 'warning',
        createdAt: new Date(2026, 4, 25, 9, 30),
        resolvedAt: new Date(2026, 4, 25, 10, 5),
        durationMinutes: 35,
      },
    ],
  };

  const mockAiSummary = 
    "During the month of May 2026, your website maintained an excellent health rating with a total uptime of 99.87% across 1,450 automated runs. " +
    "Our systems proactively flagged two service events: a brief uptime interruption and a contact form submission warning. " +
    "Our engineering team resolved both events within minutes, ensuring minimal impact on customer experience. " +
    "All security certificates remain active, and we are preparing updates for one missing analytics tracking tag.";

  const mockBranding = {
    logoUrl: null, // No custom logo, falls back to text
    brandColor: '#22d3ee', // Cyan HSL accent
    customFooter: 'Acme Care Plan Program. Prepared by My Maintenance Agency.',
    orgName: 'My Maintenance Agency',
  };

  // 2. Generate PDF Buffer
  console.log('Generating PDF report layout...');
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfBuffer(mockMetrics, mockAiSummary, mockBranding);
    console.log(`PDF compiled successfully! Buffer size: ${pdfBuffer.length} bytes.`);
    
    // Save to scratch folder for visual review
    const outputPath = path.join(__dirname, 'test-report-out.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`Saved output PDF file for visual validation: ${outputPath}`);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return;
  }

  // 3. Mock Resend Email Send to verify attachment payload structure
  const originalFetch = global.fetch;
  let capturedPayload: any = null;

  global.fetch = async (url: any, options: any) => {
    const urlStr = String(url);
    if (urlStr.includes('api.resend.com/emails')) {
      capturedPayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'mock_resend_id_999' }),
      } as Response;
    }
    return originalFetch(url, options);
  };

  try {
    console.log('\nTesting report email dispatch with PDF attachment...');
    await sendPdfReportEmail({
      to: 'admin@myagency.com',
      subject: '[Maintly Care Report] Acme Corporates - May 2026',
      siteName: mockMetrics.siteName,
      reportPeriod: 'May 2026',
      pdfBuffer,
      filename: 'acme-may-2026.pdf',
    });

    console.log('Resend email payload captured successfully:');
    console.log('To:', capturedPayload.to);
    console.log('Subject:', capturedPayload.subject);
    console.log('Has Attachments:', Array.isArray(capturedPayload.attachments));
    if (capturedPayload.attachments) {
      console.log('Attachment Name:', capturedPayload.attachments[0]?.filename);
      console.log('Attachment Content Type:', typeof capturedPayload.attachments[0]?.content);
      console.log('Attachment Content Length:', capturedPayload.attachments[0]?.content?.length);
    }
  } catch (err) {
    console.error('Failed to send email alert:', err);
  } finally {
    global.fetch = originalFetch;
  }
}

runReportTest();

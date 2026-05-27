import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';

export async function sendEmailAlert({
  to,
  subject,
  siteName,
  siteUrl,
  issue,
  severity,
  action,
  details,
  screenshotUrl,
}: {
  to: string;
  subject: string;
  siteName: string;
  siteUrl: string;
  issue: string;
  severity: 'critical' | 'warning' | 'passing';
  action: 'created' | 'resolved';
  details?: string;
  screenshotUrl?: string | null;
}) {
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY is not configured. Email alert skipped:', { to, subject, siteName, issue });
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  // Define colors based on severity
  const colors = {
    critical: { bg: '#991b1b', text: '#fef2f2', accent: '#ef4444' },
    warning: { bg: '#92400e', text: '#fffbeb', accent: '#f59e0b' },
    passing: { bg: '#065f46', text: '#ecfdf5', accent: '#10b981' },
  };

  const currentTheme = colors[severity] || colors.warning;
  const severityBadge = severity.toUpperCase();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b12; color: #f4f4f5;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #0d1527; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 30px; background-color: ${currentTheme.bg}; text-align: center;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; background-color: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; color: ${currentTheme.text};">${severityBadge}</span>
              <h1 style="margin: 15px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${subject}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                An incident update has been logged for your website.
              </p>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); width: 100px; font-weight: 600; color: #22d3ee; font-size: 14px;">Website</td>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-size: 14px;">
                    <strong>${siteName}</strong><br>
                    <a href="${siteUrl}" target="_blank" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">${siteUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; color: #22d3ee; font-size: 14px;">Issue</td>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-size: 14px; font-weight: bold;">${issue}</td>
                </tr>
                ${details ? `
                <tr>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; color: #22d3ee; font-size: 14px;">Details</td>
                  <td style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e4e4e7; font-family: monospace; font-size: 13px; line-height: 1.4; word-break: break-all;">${details}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 15px; font-weight: 600; color: #22d3ee; font-size: 14px;">Status</td>
                  <td style="padding: 15px; color: ${currentTheme.accent}; font-size: 14px; font-weight: bold;">
                    ${action === 'resolved' ? '✅ Resolved' : '🚨 Active'}
                  </td>
                </tr>
              </table>

              ${screenshotUrl ? `
              <div style="margin-bottom: 25px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #a1a1aa; text-align: left; font-weight: 600;">Failure Screenshot Evidence:</p>
                <img src="${screenshotUrl}" alt="Failure Screenshot" style="max-width: 100%; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;" />
              </div>
              ` : ''}

              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #22d3ee; color: #080c14; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 6px;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size: 12px; color: #71717a;">
              &copy; ${new Date().getFullYear()} Maintly. Automated care monitoring alert.<br>
              This notification was dispatched to you because alert settings are active for your workspace.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `[Maintly Alert] ${subject}`,
      html,
    });

    if (error) {
      console.error('[Resend] Email dispatch error:', error);
      return { success: false, error };
    }

    console.log('[Resend] Email alert dispatched successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Resend] Failed to send email alert:', err);
    return { success: false, error: err };
  }
}

/**
 * Sends a PDF report as an email attachment.
 */
export async function sendPdfReportEmail({
  to,
  subject,
  siteName,
  reportPeriod,
  pdfBuffer,
  filename,
}: {
  to: string;
  subject: string;
  siteName: string;
  reportPeriod: string;
  pdfBuffer: Buffer;
  filename: string;
}) {
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY is not configured. Email report sending skipped.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #f4f4f5; color: #18181b; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e4e4e7; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #3b82f6; margin-top: 0;">Monthly Maintenance & Health Report</h2>
          <p>Hello,</p>
          <p>Please find attached the monthly care plan report for your website <strong>${siteName}</strong>, covering the period of <strong>${reportPeriod}</strong>.</p>
          <p>This report outlines performance metrics, form test results, security statuses, and tracking tag health monitored over the course of the month.</p>
          <p>If you have any questions or require additional maintenance support, please do not hesitate to contact your administrator.</p>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
          <p style="font-size: 11px; color: #71717a;">Automated report dispatch via Maintly.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('[Resend] Email report sending error:', error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Resend] Exception sending email report:', err);
    return { success: false, error: err };
  }
}

import { eq } from 'drizzle-orm';
import { db } from '../db';
import { incidents, alertSettings } from '../db/schema';
import { sendEmailAlert } from './email';
import { sendSlackAlert } from './slack';

/**
 * Trigger alerts for a created or resolved incident.
 * Loads the incident with its related site and result, queries alert settings for the site's organization,
 * and broadcasts notifications across configured channels (email, Slack).
 */
export async function triggerAlertForIncident(
  incidentId: string,
  action: 'created' | 'resolved'
) {
  try {
    console.log(`[Alert Router] Fetching details for incident ${incidentId}...`);
    
    // Fetch incident with relational site and result records
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
      with: {
        site: true,
        result: true,
      },
    });

    if (!incident) {
      console.warn(`[Alert Router] Incident with ID ${incidentId} not found.`);
      return;
    }

    const { site, result, severity, issue } = incident;
    if (!site) {
      console.warn(`[Alert Router] Site not found for incident ${incidentId}.`);
      return;
    }

    // Fetch alert settings configured for the organization
    const settings = await db.query.alertSettings.findMany({
      where: eq(alertSettings.orgId, site.orgId),
    });

    console.log(`[Alert Router] Found ${settings.length} alert configurations for org ${site.orgId}.`);

    if (settings.length === 0) {
      console.log(`[Alert Router] No alert settings configured for org ${site.orgId}. Skipping alerts.`);
      return;
    }

    // Broadcast alerts across channels
    const dispatches = settings.map(async (setting) => {
      const { channel } = setting;
      const config = setting.config as { email?: string; webhookUrl?: string; phone?: string };

      const subject = action === 'resolved'
        ? `RESOLVED: ${site.name} is healthy again`
        : `ALERT: ${site.name} issue detected (${severity})`;

      const details = result?.details || undefined;
      const screenshotUrl = result?.screenshotUrl || undefined;

      if (channel === 'email' && config.email) {
        console.log(`[Alert Router] Dispatching email alert to ${config.email}...`);
        return sendEmailAlert({
          to: config.email,
          subject,
          siteName: site.name,
          siteUrl: site.url,
          issue,
          severity,
          action,
          details,
          screenshotUrl,
        });
      }

      if (channel === 'slack' && config.webhookUrl) {
        console.log(`[Alert Router] Dispatching Slack alert card to webhook...`);
        return sendSlackAlert({
          webhookUrl: config.webhookUrl,
          subject,
          siteName: site.name,
          siteUrl: site.url,
          issue,
          severity,
          action,
          details,
          screenshotUrl,
        });
      }

      if (channel === 'sms') {
        console.log(`[Alert Router] SMS alerts not fully configured. Logged alert: ${subject} (${config.phone || 'No phone'})`);
      }
    });

    await Promise.all(dispatches);
    console.log(`[Alert Router] Alert broadcast completed for incident ${incidentId}`);
  } catch (error) {
    console.error(`[Alert Router] Error dispatching alert for incident ${incidentId}:`, error);
  }
}

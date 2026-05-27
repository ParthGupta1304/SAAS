/**
 * Send Slack notifications formatted as Block Kit layout cards.
 */
export async function sendSlackAlert({
  webhookUrl,
  subject,
  siteName,
  siteUrl,
  issue,
  severity,
  action,
  details,
  screenshotUrl,
}: {
  webhookUrl: string;
  subject: string;
  siteName: string;
  siteUrl: string;
  issue: string;
  severity: 'critical' | 'warning' | 'passing';
  action: 'created' | 'resolved';
  details?: string;
  screenshotUrl?: string | null;
}) {
  if (!webhookUrl) {
    console.warn('[Slack] Webhook URL is empty, skipping Slack alert.');
    return { success: false, error: 'Webhook URL is required' };
  }

  // Determine emoji and color bar (color code format for Slack attachments)
  let statusEmoji = '🚨';
  let bannerColor = '#ef4444'; // Red
  if (action === 'resolved') {
    statusEmoji = '✅';
    bannerColor = '#10b981'; // Green
  } else if (severity === 'warning') {
    statusEmoji = '⚠️';
    bannerColor = '#f59e0b'; // Amber
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Construct the Block Kit structure
  interface SlackContextElement {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }

  interface SlackButtonElement {
    type: 'button';
    text?: { type: string; text: string; emoji?: boolean };
    value?: string;
    url?: string;
    style?: string;
  }

  interface SlackBlock {
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    fields?: Array<{ type: string; text: string }>;
    elements?: Array<SlackContextElement | SlackButtonElement>;
    image_url?: string;
    alt_text?: string;
    title?: { type: string; text: string; emoji?: boolean };
  }

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} ${subject}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Website:*\n<${siteUrl}|${siteName}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${action === 'resolved' ? '*Resolved*' : `*Active (${severity})*`}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Issue:*\n\`${issue}\``,
      },
    },
  ];

  if (details) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Details:*\n\`\`\`${details.substring(0, 1000)}\`\`\``,
      },
    });
  }

  if (screenshotUrl) {
    blocks.push({
      type: 'image',
      image_url: screenshotUrl,
      alt_text: 'Failure Evidence Screenshot',
      title: {
        type: 'plain_text',
        text: 'Form Failure Evidence',
        emoji: true,
      },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Dashboard',
          emoji: true,
        },
        value: 'view_dashboard',
        url: `${dashboardUrl}/dashboard`,
        style: action === 'resolved' ? 'primary' : 'danger',
      },
    ],
  });

  // Attach context metadata
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Maintly Care Alerts* | Detected at ${new Date().toLocaleString()}`,
      },
    ],
  });

  try {
    const payload = {
      text: `[Maintly Alert] ${subject}: ${issue} on ${siteName}`,
      attachments: [
        {
          color: bannerColor,
          blocks: blocks,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API responded with status ${response.status}: ${errorText}`);
    }

    console.log('[Slack] Alert dispatched successfully to webhook');
    return { success: true };
  } catch (err) {
    console.error('[Slack] Failed to send webhook alert:', err);
    return { success: false, error: err };
  }
}

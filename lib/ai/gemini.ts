import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReportMetrics } from '../reports/reports';

// Initialize the Google Generative AI client.
// It will fail gracefully if GEMINI_API_KEY is not defined.
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generates a client-friendly, professional monthly summary for the client report.
 * Translates technical metrics into the business value the agency provided.
 */
export async function generateReportNarrative(metrics: ReportMetrics): Promise<string> {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthStr = monthNames[metrics.month - 1] || 'Billing Month';

  // Construct fallback narrative in case Gemini is not configured or fails
  const getFallbackNarrative = () => {
    let text = `During the month of ${monthStr} ${metrics.year}, we monitored your website, ${metrics.siteName}, across ${metrics.totalChecks} automated tests. `;
    text += `Your website maintained an excellent uptime rating of ${metrics.uptimePercent}%. `;
    
    if (metrics.incidentsCount > 0) {
      text += `Our monitoring engine detected ${metrics.incidentsCount} service event(s). `;
      const resolved = metrics.incidentList.filter((i) => i.resolvedAt !== null).length;
      if (resolved > 0) {
        text += `Our support team proactively responded to and resolved all ${resolved} event(s), keeping downtime to a minimum. `;
      }
    } else {
      text += `No service interruptions or performance incidents were detected. `;
    }

    if (metrics.sslExpiryDaysLeft !== null && metrics.sslExpiryDaysLeft < 30) {
      text += `We have flagged that your SSL Security Certificate is expiring in ${metrics.sslExpiryDaysLeft} days, and we are preparing to renew it. `;
    } else {
      text += `Your website security certificate (SSL) remains active and secure. `;
    }

    if (metrics.formCheckSuccessRate !== null) {
      text += `Automated form audits completed successfully with a ${metrics.formCheckSuccessRate}% success rate, confirming that your customers can submit inquiries without friction. `;
    }

    return text;
  };

  if (!genAI) {
    console.warn('[Gemini] GEMINI_API_KEY is missing. Falling back to default template summary.');
    return getFallbackNarrative();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert copywriter for a premium website design, hosting, and maintenance agency.
Your task is to write a monthly executive summary report for a client's website care plan. 
You must convert raw technical metrics into a highly reassuring, client-friendly, and professional narrative that demonstrates the massive value of our agency's care plan.

Here are the metrics for the month of ${monthStr} ${metrics.year}:
- Website: ${metrics.siteName} (${metrics.siteUrl})
- Total Uptime: ${metrics.uptimePercent}%
- Automated Checks Conducted: ${metrics.totalChecks}
- Total Incidents/Errors Detected: ${metrics.incidentsCount}
- Incidents Resolved: ${metrics.incidentsResolvedCount}
- Form Submissions Success Rate: ${metrics.formCheckSuccessRate !== null ? `${metrics.formCheckSuccessRate}% (out of ${metrics.formCheckTotal} tests)` : 'No form checks configured'}
- SSL Certificate Expiration: ${metrics.sslExpiryDaysLeft !== null ? `${metrics.sslExpiryDaysLeft} days remaining` : 'Secure/Valid'}
- Domain Expiration: ${metrics.domainExpiryDaysLeft !== null ? `${metrics.domainExpiryDaysLeft} days remaining` : 'Active'}
- Missing Tracking Pixels: ${metrics.trackingPixelStatus.missing.length > 0 ? metrics.trackingPixelStatus.missing.join(', ') : 'None'}

Here is a list of incidents that occurred (if any):
${metrics.incidentList.map(i => `- [${i.severity.toUpperCase()}] ${i.issue} (Resolved: ${i.resolvedAt ? `Yes, duration ${i.durationMinutes}m` : 'No'})`).join('\n')}

Guidelines:
1. Write 2 short, cohesive paragraphs (maximum 150-180 words total).
2. DO NOT list numbers in bullet points. Integrate them naturally into the text.
3. Be reassuring. If there was downtime or an issue, explain that our systems automatically detected it and our team resolved it quickly (which highlights the care plan's value).
4. Do not sound too technical. Use words like "service event", "proactive updates", or "inquiry channel" instead of "downtime", "crashes", or "database errors" where possible.
5. Emphasize that our team is proactively guarding their digital storefront so they can focus on their business.
6. Return ONLY the plain text summary paragraphs. No markdown header, no introduction, and no outro.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.7,
      }
    });

    const text = result.response.text().trim();
    return text || getFallbackNarrative();
  } catch (error) {
    console.error('[Gemini] Narrative generation failed. Falling back to default template. Error:', error);
    return getFallbackNarrative();
  }
}

export interface FormSelectorMap {
  nameSelector: string | null;
  emailSelector: string | null;
  messageSelector: string | null;
  submitButtonSelector: string | null;
  successText: string | null;
}

/**
 * Scans HTML source code and returns selectors for key contact fields (Name, Email, Message, Submit button, Success Text)
 */
export async function analyzeFormHtml(htmlContent: string): Promise<FormSelectorMap> {
  const defaultSelectors: FormSelectorMap = {
    nameSelector: 'input[name="name"], input[name="first-name"], input[id="name"]',
    emailSelector: 'input[type="email"], input[name="email"], input[id="email"]',
    messageSelector: 'textarea[name="message"], textarea[id="message"]',
    submitButtonSelector: 'button[type="submit"], input[type="submit"]',
    successText: 'thank',
  };

  if (!genAI) {
    console.warn('[Gemini] GEMINI_API_KEY is missing. Falling back to default selectors for form check.');
    return defaultSelectors;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert QA Automation engineer. You are integrating a form check tool.
We will give you the simplified HTML of a contact form. 
Your job is to identify the CSS selectors that can be used to fill out the form fields (Name, Email, and Message) and click the submit button. 
You must also identify a likely keyword in the form or standard confirmation pages representing success (e.g., "thank", "success", "received", "submitted").

Here is the HTML content of the form page:
\`\`\`html
${htmlContent.substring(0, 15000)} // truncate to prevent token issues
\`\`\`

Analyze the HTML and return a JSON object with the exact keys:
1. "nameSelector": CSS selector for the name field (input/textarea) or null if none
2. "emailSelector": CSS selector for the email field (input) or null if none
3. "messageSelector": CSS selector for the message field (textarea/input) or null if none
4. "submitButtonSelector": CSS selector for the submit button or submit input (e.g. "button[type='submit']") or null if none
5. "successText": A lowercase keyword or short phrase (e.g., "thank" or "success") to look for on the success screen.

Return ONLY a valid JSON block inside markdown. Make sure the selectors are specific, standard CSS selectors that can be resolved via document.querySelector.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.1, // low temperature for precise JSON
      }
    });

    const responseText = result.response.text();
    // Parse JSON from code block
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0].trim());
      return {
        nameSelector: parsed.nameSelector || defaultSelectors.nameSelector,
        emailSelector: parsed.emailSelector || defaultSelectors.emailSelector,
        messageSelector: parsed.messageSelector || defaultSelectors.messageSelector,
        submitButtonSelector: parsed.submitButtonSelector || defaultSelectors.submitButtonSelector,
        successText: parsed.successText || defaultSelectors.successText,
      };
    }
    
    return defaultSelectors;
  } catch (error) {
    console.error('[Gemini] HTML Form analysis failed. Falling back to default selectors. Error:', error);
    return defaultSelectors;
  }
}

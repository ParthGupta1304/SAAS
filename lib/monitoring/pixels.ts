/**
 * Normalizes the URL string.
 */
function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url;
  }
  return url;
}

/**
 * Fetches the HTML of a page and scans for standard tracking pixels.
 * 
 * @param url The URL of the page to scan.
 * @param expectedPixels List of pixels to check for: 'ga4', 'gtm', 'meta', 'linkedin'.
 * @returns A promise resolving to found and missing pixels, and overall success status.
 */
export async function checkPixels(
  url: string,
  expectedPixels: ('ga4' | 'gtm' | 'meta' | 'linkedin')[]
): Promise<{
  success: boolean;
  foundPixels: string[];
  missingPixels: string[];
}> {
  const foundPixels: string[] = [];
  const missingPixels: string[] = [];

  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const targetUrl = normalizeUrl(url);
    const controller = new AbortController();
    
    // Set a 10-second timeout for downloading the HTML
    timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'MaintlyPixelBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If server returns error, we cannot analyze pixels; all expected are missing.
      return {
        success: false,
        foundPixels: [],
        missingPixels: expectedPixels,
      };
    }

    const html = await response.text();

    // Regex patterns for tracking pixels
    const patterns = {
      ga4: /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+|gtag\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]+['"]/i,
      gtm: /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/ns\.html\?id=GTM-[A-Z0-9]+|['"]GTM-[A-Z0-9]+['"]/i,
      meta: /connect\.facebook\.net\/[a-z_]+\/fbevents\.js|fbq\(\s*['"]init['"]\s*,\s*['"]\d+['"]/i,
      linkedin: /snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js|_linkedin_partner_id|_linkedin_data_partner_id/i,
    };

    for (const pixel of expectedPixels) {
      const pattern = patterns[pixel];
      if (pattern && pattern.test(html)) {
        foundPixels.push(pixel);
      } else {
        missingPixels.push(pixel);
      }
    }

    return {
      success: missingPixels.length === 0,
      foundPixels,
      missingPixels,
    };
  } catch {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // In case of error (e.g. network failure, timeout), we treat all expected pixels as missing
    return {
      success: false,
      foundPixels: [],
      missingPixels: expectedPixels,
    };
  }
}

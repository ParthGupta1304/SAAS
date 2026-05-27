import { performance } from 'perf_hooks';

/**
 * Normalizes a URL, ensuring it starts with http:// or https://.
 */
function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url;
  }
  return url;
}

/**
 * Checks the uptime of a website by making a GET request.
 * Measures response time and checks for non-2xx statuses.
 * 
 * @param url The URL of the website to check.
 * @returns An object indicating success, response time in milliseconds, and optional error message.
 */
export async function checkUptime(url: string): Promise<{
  success: boolean;
  responseTime: number;
  errorMsg?: string;
}> {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const targetUrl = normalizeUrl(url);
    const controller = new AbortController();
    
    // Set a 10-second timeout for the fetch request
    timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    const startTime = performance.now();

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MaintlyUptimeBot/1.0',
      },
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (!response.ok) {
      return {
        success: false,
        responseTime,
        errorMsg: `HTTP Status Code: ${response.status} ${response.statusText}`,
      };
    }

    return {
      success: true,
      responseTime,
    };
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    const isAbort = error instanceof Error && error.name === 'AbortError';
    if (isAbort) {
      return {
        success: false,
        responseTime: 10000,
        errorMsg: 'Request timed out after 10000ms',
      };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      responseTime: 0,
      errorMsg,
    };
  }
}

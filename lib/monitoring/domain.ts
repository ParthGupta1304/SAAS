import { URL } from 'url';

/**
 * Extracts the registered apex domain (e.g. google.com) from a URL or hostname.
 * Handles common country-code second level domains (e.g. co.uk, com.au).
 */
export function getApexDomain(url: string): string {
  let hostname = url.trim();
  if (!/^https?:\/\//i.test(hostname)) {
    hostname = 'https://' + hostname;
  }
  try {
    const parsed = new URL(hostname);
    hostname = parsed.hostname;
  } catch {
    hostname = hostname.replace(/^https?:\/\//i, '').split('/')[0];
  }

  hostname = hostname.split(':')[0].toLowerCase();

  const parts = hostname.split('.');
  if (parts.length <= 2) {
    return hostname;
  }

  // Common second level domains
  const secondLevelDomains = new Set([
    'co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'nom', 'sch', 'mil'
  ]);

  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  if (lastPart.length === 2 && secondLevelDomains.has(secondLastPart)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

interface RDAPResponse {
  events?: Array<{
    eventAction?: string;
    eventDate?: string;
  }>;
}

/**
 * Queries a standard RDAP server for domain details.
 */
async function queryRDAP(domain: string, bootstrapUrl: string): Promise<RDAPResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

  try {
    const response = await fetch(`${bootstrapUrl}${domain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/rdap+json, application/json',
        'User-Agent': 'MaintlyDomainBot/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as RDAPResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Checks domain registration expiry via RDAP JSON queries.
 * 
 * @param url The website URL or hostname.
 * @returns A promise resolving to domain expiration info.
 */
export async function checkDomain(url: string): Promise<{
  success: boolean;
  daysRemaining?: number;
  expiryDate?: Date;
  errorMsg?: string;
}> {
  try {
    const domain = getApexDomain(url);
    if (!domain || !domain.includes('.')) {
      return {
        success: false,
        errorMsg: `Invalid domain format extracted: ${domain || 'none'}`,
      };
    }

    let rdapData: RDAPResponse | null = null;
    let lastError: string = '';

    // 1. Try querying primary rdap.org bootstrap
    try {
      rdapData = await queryRDAP(domain, 'https://rdap.org/domain/');
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);

      // 2. Fallback for .com or .net domains directly to Verisign RDAP
      if (domain.endsWith('.com') || domain.endsWith('.net')) {
        try {
          rdapData = await queryRDAP(domain, 'https://rdap.verisign-grs.com/rdap/domain/');
        } catch (verisignErr) {
          const verisignMsg = verisignErr instanceof Error ? verisignErr.message : String(verisignErr);
          lastError = `rdap.org: ${lastError}; verisign: ${verisignMsg}`;
        }
      }
    }

    if (!rdapData) {
      return {
        success: false,
        errorMsg: `Failed to fetch RDAP data for domain "${domain}". Error details: ${lastError}`,
      };
    }

    const events = rdapData.events || [];
    const expiryEvent = events.find((e) => {
      if (!e.eventAction || typeof e.eventAction !== 'string') return false;
      const action = e.eventAction.toLowerCase();
      return (
        action === 'expiration' ||
        action === 'registration expiration' ||
        action.includes('expiry') ||
        action.includes('expiration')
      );
    });

    if (!expiryEvent || !expiryEvent.eventDate) {
      return {
        success: false,
        errorMsg: 'RDAP response did not contain expiration event details',
      };
    }

    const expiryDate = new Date(expiryEvent.eventDate);
    if (isNaN(expiryDate.getTime())) {
      return {
        success: false,
        errorMsg: `Invalid date format in RDAP response: ${expiryEvent.eventDate}`,
      };
    }

    const now = new Date();
    const msRemaining = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      success: true,
      daysRemaining,
      expiryDate,
    };
  } catch (error) {
    return {
      success: false,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

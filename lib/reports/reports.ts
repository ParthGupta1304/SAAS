import { db } from '../db';
import { checks, checkResults, incidents, sites } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface ReportMetrics {
  siteName: string;
  siteUrl: string;
  month: number;
  year: number;
  totalChecks: number;
  uptimePercent: number;
  incidentsCount: number;
  incidentsResolvedCount: number;
  sslExpiryDaysLeft: number | null;
  domainExpiryDaysLeft: number | null;
  trackingPixelStatus: {
    expected: string[];
    found: string[];
    missing: string[];
  };
  formCheckSuccessRate: number | null; // null if no form checks configured
  formCheckTotal: number;
  incidentList: {
    id: string;
    issue: string;
    severity: string;
    createdAt: Date;
    resolvedAt: Date | null;
    durationMinutes: number | null;
  }[];
}

/**
 * Aggregates all check and incident metrics for a specific site over a given month & year.
 */
export async function getReportData(siteId: string, month: number, year: number): Promise<ReportMetrics | null> {
  // 1. Fetch site details
  const siteList = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (siteList.length === 0) return null;
  const site = siteList[0];

  // Calculate start and end dates for the target month
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 2. Fetch checks for the site
  const siteChecks = await db.select().from(checks).where(eq(checks.siteId, siteId));

  // 3. Fetch check results for all checks in the date range
  const checkIds = siteChecks.map((c) => c.id);
  
  interface CheckResultRow {
    id: string;
    checkId: string;
    status: 'passing' | 'warning' | 'critical';
    responseTime: number | null;
    details: string | null;
    createdAt: Date;
  }

  let allResults: CheckResultRow[] = [];
  if (checkIds.length > 0) {
    allResults = await db
      .select({
        id: checkResults.id,
        checkId: checkResults.checkId,
        status: checkResults.status,
        responseTime: checkResults.responseTime,
        details: checkResults.details,
        createdAt: checkResults.createdAt,
      })
      .from(checkResults)
      .where(
        and(
          sql`${checkResults.checkId} IN ${checkIds}`,
          gte(checkResults.createdAt, startDate),
          lte(checkResults.createdAt, endDate)
        )
      );
  }

  // 4. Fetch incidents for the site in the date range
  const allIncidents = await db
    .select({
      id: incidents.id,
      severity: incidents.severity,
      issue: incidents.issue,
      createdAt: incidents.createdAt,
      resolvedAt: incidents.resolvedAt,
    })
    .from(incidents)
    .where(
      and(
        eq(incidents.siteId, siteId),
        gte(incidents.createdAt, startDate),
        lte(incidents.createdAt, endDate)
      )
    );

  // Compute metrics
  const totalChecks = allResults.length;
  
  // Uptime check metrics
  const uptimeCheck = siteChecks.find((c) => c.type === 'uptime');
  const uptimeResults = uptimeCheck
    ? allResults.filter((r) => r.checkId === uptimeCheck.id)
    : [];
  const passingUptime = uptimeResults.filter((r) => r.status === 'passing').length;
  const uptimePercent = uptimeResults.length > 0
    ? Number(((passingUptime / uptimeResults.length) * 100).toFixed(2))
    : 100; // assume 100% if no results yet or no uptime check

  // SSL status
  const sslCheck = siteChecks.find((c) => c.type === 'ssl');
  let sslExpiryDaysLeft: number | null = null;
  if (sslCheck && sslCheck.config) {
    const config = sslCheck.config as { daysRemaining?: number };
    if (config.daysRemaining !== undefined) {
      sslExpiryDaysLeft = Number(config.daysRemaining);
    }
  }

  // Domain status
  const domainCheck = siteChecks.find((c) => c.type === 'domain');
  let domainExpiryDaysLeft: number | null = null;
  if (domainCheck && domainCheck.config) {
    const config = domainCheck.config as { daysRemaining?: number };
    if (config.daysRemaining !== undefined) {
      domainExpiryDaysLeft = Number(config.daysRemaining);
    }
  }

  // Tracking pixel status
  const trackingCheck = siteChecks.find((c) => c.type === 'tracking');
  const trackingPixelStatus = {
    expected: [] as string[],
    found: [] as string[],
    missing: [] as string[],
  };
  if (trackingCheck && trackingCheck.config) {
    const config = trackingCheck.config as { expectedPixels?: string[]; pixels?: string[] };
    const expected = config.expectedPixels || config.pixels || [];
    trackingPixelStatus.expected = expected;

    // Look at latest tracking result
    const latestTrackingResult = allResults
      .filter((r) => r.checkId === trackingCheck.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    
    if (latestTrackingResult && latestTrackingResult.details) {
      try {
        const detailsObj = JSON.parse(latestTrackingResult.details);
        trackingPixelStatus.found = detailsObj.found || [];
        trackingPixelStatus.missing = detailsObj.missing || [];
      } catch {
        // Handled below if JSON parsing fails
      }
    }
    
    // Fallback/Default if no results
    if (trackingPixelStatus.found.length === 0 && trackingPixelStatus.missing.length === 0) {
      trackingPixelStatus.missing = expected;
    }
  }

  // Form check success rate
  const formCheck = siteChecks.find((c) => c.type === 'form');
  let formCheckSuccessRate: number | null = null;
  let formCheckTotal = 0;
  if (formCheck) {
    const formResults = allResults.filter((r) => r.checkId === formCheck.id);
    formCheckTotal = formResults.length;
    if (formCheckTotal > 0) {
      const formPassing = formResults.filter((r) => r.status === 'passing').length;
      formCheckSuccessRate = Number(((formPassing / formCheckTotal) * 100).toFixed(2));
    }
  }

  // Compile incident list details
  const incidentList = allIncidents.map((inc) => {
    let durationMinutes: number | null = null;
    if (inc.resolvedAt) {
      const diffMs = inc.resolvedAt.getTime() - inc.createdAt.getTime();
      durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    }
    return {
      id: inc.id,
      issue: inc.issue,
      severity: inc.severity,
      createdAt: inc.createdAt,
      resolvedAt: inc.resolvedAt,
      durationMinutes,
    };
  });

  const incidentsCount = allIncidents.length;
  const incidentsResolvedCount = allIncidents.filter((i) => i.resolvedAt !== null).length;

  return {
    siteName: site.name,
    siteUrl: site.url,
    month,
    year,
    totalChecks,
    uptimePercent,
    incidentsCount,
    incidentsResolvedCount,
    sslExpiryDaysLeft,
    domainExpiryDaysLeft,
    trackingPixelStatus,
    formCheckSuccessRate,
    formCheckTotal,
    incidentList,
  };
}

import express from 'express';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { eq, and, ne, or, isNull, inArray, sql, desc } from 'drizzle-orm';

import { db } from '../lib/db';
import { sites, checks, checkResults, incidents, reports, organizations } from '../lib/db/schema';
import { checkUptime } from '../lib/monitoring/uptime';
import { checkSSL } from '../lib/monitoring/ssl';
import { checkDomain } from '../lib/monitoring/domain';
import { checkPixels } from '../lib/monitoring/pixels';

// Load Env variables in case process isn't running via next dev
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize Supabase client for screenshot uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * -----------------------------------------------------------------------------
 * 1. PERSISTENT HELPER UTILITIES
 * -----------------------------------------------------------------------------
 */

/**
 * Chunk helper to execute tasks in parallel batches of a specific size.
 */
async function processInBatches<T>(items: T[], batchSize: number, workerFn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => workerFn(item)));
  }
}

/**
 * Uploads screenshot buffers directly to Supabase screenshots bucket.
 */
async function uploadScreenshot(buffer: Buffer, siteName: string): Promise<string | null> {
  if (!supabase) {
    console.log('[Supabase] Storage client not configured, skipping screenshot upload.');
    return null;
  }

  const filename = `${siteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`;

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = buckets?.some((b) => b.name === 'screenshots');
    if (!hasBucket) {
      await supabase.storage.createBucket('screenshots', { public: true });
      console.log('[Supabase] Created bucket "screenshots".');
    }
  } catch (err) {
    console.error('[Supabase] Error listing/creating bucket:', err);
  }

  try {
    const { error } = await supabase.storage
      .from('screenshots')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('screenshots').getPublicUrl(filename);
    return data.publicUrl;
  } catch (err) {
    console.error('[Supabase] Screenshot upload error:', err);
    return null;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 2. MONITOR RUNNERS
 * -----------------------------------------------------------------------------
 */

/**
 * Runs Uptime HTTP checker.
 */
async function runUptimeChecks() {
  console.log('[Scheduler] Starting uptime checks...');
  const activeUptimeChecks = await db
    .select({
      check: checks,
      site: sites,
    })
    .from(checks)
    .innerJoin(sites, eq(checks.siteId, sites.id))
    .where(and(eq(checks.type, 'uptime'), eq(checks.isActive, true), eq(sites.isActive, true)));

  console.log(`[Scheduler] Found ${activeUptimeChecks.length} active uptime checks to execute.`);

  await processInBatches(activeUptimeChecks, 50, async ({ check, site }) => {
    try {
      const result = await checkUptime(site.url);

      const [newResult] = await db
        .insert(checkResults)
        .values({
          checkId: check.id,
          status: result.success ? 'passing' : 'critical',
          responseTime: result.responseTime,
          details: result.errorMsg || 'Uptime check passed',
        })
        .returning();

      if (!result.success) {
        const existingIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });

        if (!existingIncident) {
          await db.insert(incidents).values({
            siteId: site.id,
            checkResultId: newResult.id,
            severity: 'critical',
            issue: result.errorMsg || 'Website is down',
          });
          console.log(`[Alert] Incident created for ${site.name}: ${result.errorMsg}`);
        }
      } else {
        const openIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });

        if (openIncident) {
          await db
            .update(incidents)
            .set({ resolvedAt: new Date() })
            .where(eq(incidents.id, openIncident.id));
          console.log(`[Alert] Incident resolved for ${site.name}`);
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Uptime check failed for site ${site.name}:`, err);
    }
  });

  console.log('[Scheduler] Finished uptime checks.');
}

/**
 * Runs SSL, Domain, and Pixel checkers daily.
 */
async function runDailyChecks() {
  console.log('[Scheduler] Starting daily checks (SSL, Domain, Pixels)...');

  // A. SSL CERTIFICATE CHECKS
  const activeSslChecks = await db
    .select({ check: checks, site: sites })
    .from(checks)
    .innerJoin(sites, eq(checks.siteId, sites.id))
    .where(and(eq(checks.type, 'ssl'), eq(checks.isActive, true), eq(sites.isActive, true)));

  await processInBatches(activeSslChecks, 50, async ({ check, site }) => {
    try {
      const result = await checkSSL(site.url);
      const isCritical = !result.success || (result.daysRemaining !== undefined && result.daysRemaining <= 7);
      const isWarning = result.daysRemaining !== undefined && result.daysRemaining > 7 && result.daysRemaining <= 30;
      const status = isCritical ? 'critical' : isWarning ? 'warning' : 'passing';

      const [newResult] = await db
        .insert(checkResults)
        .values({
          checkId: check.id,
          status,
          details: result.errorMsg || `SSL Certificate is valid. Days remaining: ${result.daysRemaining}`,
        })
        .returning();

      if (isCritical || isWarning) {
        const existingIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });

        if (!existingIncident) {
          await db.insert(incidents).values({
            siteId: site.id,
            checkResultId: newResult.id,
            severity: status,
            issue: result.errorMsg || `SSL certificate expires in ${result.daysRemaining} days`,
          });
        }
      } else {
        const openIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });
        if (openIncident) {
          await db
            .update(incidents)
            .set({ resolvedAt: new Date() })
            .where(eq(incidents.id, openIncident.id));
        }
      }
    } catch (err) {
      console.error(`[Scheduler] SSL check error for ${site.name}:`, err);
    }
  });

  // B. DOMAIN EXPIRATION CHECKS
  const activeDomainChecks = await db
    .select({ check: checks, site: sites })
    .from(checks)
    .innerJoin(sites, eq(checks.siteId, sites.id))
    .where(and(eq(checks.type, 'domain'), eq(checks.isActive, true), eq(sites.isActive, true)));

  await processInBatches(activeDomainChecks, 50, async ({ check, site }) => {
    try {
      const result = await checkDomain(site.url);
      const isCritical = !result.success || (result.daysRemaining !== undefined && result.daysRemaining <= 14);
      const isWarning = result.daysRemaining !== undefined && result.daysRemaining > 14 && result.daysRemaining <= 60;
      const status = isCritical ? 'critical' : isWarning ? 'warning' : 'passing';

      const [newResult] = await db
        .insert(checkResults)
        .values({
          checkId: check.id,
          status,
          details: result.errorMsg || `Domain is registered. Days remaining: ${result.daysRemaining}`,
        })
        .returning();

      if (isCritical || isWarning) {
        const existingIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });

        if (!existingIncident) {
          await db.insert(incidents).values({
            siteId: site.id,
            checkResultId: newResult.id,
            severity: status,
            issue: result.errorMsg || `Domain registration expires in ${result.daysRemaining} days`,
          });
        }
      } else {
        const openIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });
        if (openIncident) {
          await db
            .update(incidents)
            .set({ resolvedAt: new Date() })
            .where(eq(incidents.id, openIncident.id));
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Domain check error for ${site.name}:`, err);
    }
  });

  // C. TRACKING PIXEL CHECKS
  const activePixelChecks = await db
    .select({ check: checks, site: sites })
    .from(checks)
    .innerJoin(sites, eq(checks.siteId, sites.id))
    .where(and(eq(checks.type, 'tracking'), eq(checks.isActive, true), eq(sites.isActive, true)));

  await processInBatches(activePixelChecks, 50, async ({ check, site }) => {
    try {
      const config = check.config as { expectedPixels?: Array<'ga4' | 'gtm' | 'meta' | 'linkedin'> };
      const expected = config.expectedPixels || ['ga4'];

      const result = await checkPixels(site.url, expected);

      const [newResult] = await db
        .insert(checkResults)
        .values({
          checkId: check.id,
          status: result.success ? 'passing' : 'warning',
          details: result.success
            ? `All pixels detected: ${result.foundPixels.join(', ')}`
            : `Missing pixels: ${result.missingPixels.join(', ')}. Found: ${result.foundPixels.join(', ')}`,
        })
        .returning();

      if (!result.success) {
        const existingIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });

        if (!existingIncident) {
          await db.insert(incidents).values({
            siteId: site.id,
            checkResultId: newResult.id,
            severity: 'warning',
            issue: `Missing tracking pixels: ${result.missingPixels.join(', ')}`,
          });
        }
      } else {
        const openIncident = await db.query.incidents.findFirst({
          where: and(eq(incidents.siteId, site.id), isNull(incidents.resolvedAt)),
        });
        if (openIncident) {
          await db
            .update(incidents)
            .set({ resolvedAt: new Date() })
            .where(eq(incidents.id, openIncident.id));
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Pixel check error for ${site.name}:`, err);
    }
  });

  console.log('[Scheduler] Finished daily checks.');
}

/**
 * -----------------------------------------------------------------------------
 * 3. PLAYWRIGHT FORM SUBMISSION QUEUE
 * -----------------------------------------------------------------------------
 */

interface FormCheckConfig {
  formUrl: string;
  formSelector?: string;
  submitButtonSelector?: string;
  fields?: Array<{ name: string; value: string }>;
  successText?: string;
}

interface FormJob {
  checkId: string;
  siteId: string;
  siteName: string;
  config: FormCheckConfig;
}

const formQueue: FormJob[] = [];
let isProcessingQueue = false;

/**
 * Core Playwright browser engine checks contact form.
 */
async function runFormCheck(config: FormCheckConfig): Promise<{
  success: boolean;
  screenshot?: Buffer;
  errorMsg?: string;
}> {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(config.formUrl, { waitUntil: 'networkidle', timeout: 15000 });

    const fields = config.fields || [
      { name: 'name', value: 'Maintly Test Bot' },
      { name: 'email', value: 'test@maintly.com' },
      { name: 'message', value: 'Automated contact form check by Maintly.' },
    ];

    for (const field of fields) {
      const inputSelector = `input[name="${field.name}"], input[id="${field.name}"], textarea[name="${field.name}"], textarea[id="${field.name}"]`;
      const element = await page.$(inputSelector);
      if (element) {
        await element.fill(field.value);
      } else {
        const generalElement = await page.$(
          `input[placeholder*="${field.name}" i], textarea[placeholder*="${field.name}" i]`
        );
        if (generalElement) {
          await generalElement.fill(field.value);
        }
      }
    }

    const submitSelector = config.submitButtonSelector || 'button[type="submit"], input[type="submit"]';
    const submitButton = await page.$(submitSelector);
    if (submitButton) {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
        submitButton.click(),
      ]);
    } else {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.submit();
      });
      await page.waitForTimeout(3000);
    }

    const successText = config.successText || 'thank';
    const content = await page.textContent('body');
    const isSuccess = content ? content.toLowerCase().includes(successText.toLowerCase()) : false;

    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    if (!isSuccess) {
      return {
        success: false,
        screenshot,
        errorMsg: `Confirmation text "${successText}" not found on page after submission.`,
      };
    }

    return {
      success: true,
      screenshot,
    };
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return {
      success: false,
      errorMsg: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Sequential queue executor processing Playwright form checks one by one
 * to throttle hardware usage and keep VPS RAM clear.
 */
async function processFormQueue() {
  if (formQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const job = formQueue.shift();
  if (!job) {
    await processFormQueue();
    return;
  }

  console.log(`[Queue] Processing form check for ${job.siteName}...`);

  try {
    const result = await runFormCheck(job.config);
    let screenshotUrl = null;

    if (result.screenshot) {
      screenshotUrl = await uploadScreenshot(result.screenshot, job.siteName);
    }

    const [newResult] = await db
      .insert(checkResults)
      .values({
        checkId: job.checkId,
        status: result.success ? 'passing' : 'critical',
        details: result.errorMsg || 'Form submission check completed successfully',
        screenshotUrl,
      })
      .returning();

    if (!result.success) {
      const existingIncident = await db.query.incidents.findFirst({
        where: and(eq(incidents.siteId, job.siteId), isNull(incidents.resolvedAt)),
      });

      if (!existingIncident) {
        await db.insert(incidents).values({
          siteId: job.siteId,
          checkResultId: newResult.id,
          severity: 'critical',
          issue: result.errorMsg || 'Form submission validation failed',
        });
      }
    } else {
      const openIncident = await db.query.incidents.findFirst({
        where: and(eq(incidents.siteId, job.siteId), isNull(incidents.resolvedAt)),
      });
      if (openIncident) {
        await db
          .update(incidents)
          .set({ resolvedAt: new Date() })
          .where(eq(incidents.id, openIncident.id));
      }
    }
  } catch (err) {
    console.error(`[Queue] Form check error for ${job.siteName}:`, err);
  }

  // Cool down period before launching next headless browser
  setTimeout(async () => {
    await processFormQueue();
  }, 5000);
}

/**
 * Triggers and enlists all valid form checks.
 */
async function runFormChecks() {
  console.log('[Scheduler] Triggering form checks...');

  // paid organizations or enabled form checking overrides
  const activeFormChecks = await db
    .select({
      check: checks,
      site: sites,
      org: organizations,
    })
    .from(checks)
    .innerJoin(sites, eq(checks.siteId, sites.id))
    .innerJoin(organizations, eq(sites.orgId, organizations.id))
    .where(
      and(
        eq(checks.isActive, true),
        eq(sites.isActive, true),
        eq(checks.type, 'form'),
        or(ne(organizations.plan, 'trial'), eq(organizations.formChecksEnabled, true))
      )
    );

  console.log(`[Scheduler] Found ${activeFormChecks.length} active form checks to queue.`);

  for (const item of activeFormChecks) {
    const config = item.check.config as any;
    if (config?.formUrl) {
      formQueue.push({
        checkId: item.check.id,
        siteId: item.site.id,
        siteName: item.site.name,
        config: {
          formUrl: config.formUrl,
          formSelector: config.formSelector,
          submitButtonSelector: config.submitButtonSelector,
          fields: config.fields,
          successText: config.successText,
        },
      });
    }
  }

  if (!isProcessingQueue && formQueue.length > 0) {
    await processFormQueue();
  }
}

/**
 * -----------------------------------------------------------------------------
 * 4. EXPRESS ROUTE API ENDPOINT (MANUAL TESTING / CRAWL OVERRIDES)
 * -----------------------------------------------------------------------------
 */

app.post('/check-form', async (req, res) => {
  const { formUrl, formSelector, submitButtonSelector, fields, successText } = req.body;

  if (!formUrl) {
    return res.status(400).json({ error: 'formUrl is required' });
  }

  console.log(`[API] Manual form check triggered for: ${formUrl}`);

  try {
    const result = await runFormCheck({
      formUrl,
      formSelector,
      submitButtonSelector,
      fields,
      successText,
    });

    let screenshotUrl = null;
    if (result.screenshot) {
      screenshotUrl = await uploadScreenshot(result.screenshot, 'Manual_API_Crawl');
    }

    return res.json({
      success: result.success,
      screenshotUrl,
      errorMsg: result.errorMsg,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * -----------------------------------------------------------------------------
 * 5. CRON TRIGGER SCHEDULER
 * -----------------------------------------------------------------------------
 */

// Cron 1: Uptime Check (Runs every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  console.log('[Cron Trigger] Uptime checks running...');
  await runUptimeChecks();
});

// Cron 2: Daily checks (SSL, Domain, Pixels) - Runs daily at 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron Trigger] Daily SSL, Domain & Pixel checks running...');
  await runDailyChecks();
});

// Cron 3: Form check submissions - Runs every 12 hours (08:00 and 20:00)
cron.schedule('0 */12 * * *', async () => {
  console.log('[Cron Trigger] 12-hour Form submission checks running...');
  await runFormChecks();
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Maintly persistent worker listening on port ${PORT}`);
  console.log('⏰ node-cron schedulers successfully initialized.');
});

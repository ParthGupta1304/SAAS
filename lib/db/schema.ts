/**
 * Database schema definitions for Maintly using Drizzle ORM.
 * Defines pgEnums, tables (organizations, sites, checks, check_results, incidents, reports, alert_settings),
 * and their associated relational definitions.
 */

import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
/**
 * Subscription plan tiers for Maintly organizations.
 */
export const planEnum = pgEnum('plan', ['trial', 'starter', 'growth', 'agency', 'scale']);

/**
 * Supported monitoring check types.
 */
export const checkTypeEnum = pgEnum('check_type', ['uptime', 'ssl', 'domain', 'form', 'tracking']);

/**
 * Severity/passing status of a check run.
 */
export const checkStatusEnum = pgEnum('check_status', ['passing', 'warning', 'critical']);

/**
 * Delivery status for monthly client reports.
 */
export const reportStatusEnum = pgEnum('report_status', ['draft', 'approved', 'sent']);

/**
 * Organizations table holding agency workspaces, billing details, and plan limits.
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkOrgId: text('clerk_org_id').notNull().unique(), // clerk org_... or user_... id
  name: text('name').notNull(),
  plan: planEnum('plan').default('trial').notNull(),
  trialEndsAt: timestamp('trial_ends_at').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id'), // can also store Lemon Squeezy subscription id
  isWhiteLabel: boolean('is_white_label').default(false).notNull(),
  formChecksEnabled: boolean('form_checks_enabled').default(false).notNull(),
  maxSites: integer('max_sites').default(3).notNull(),
  logoUrl: text('logo_url'),
  brandColor: text('brand_color'),
  customFooter: text('custom_footer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Sites table containing monitored URLs and names linked to organizations.
 */
export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  clientName: text('client_name'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Checks config table specifying which monitoring checks (uptime, ssl, domain, form, tracking)
 * are enabled for each site, their query intervals, and check-specific config payloads.
 */
export const checks = pgTable('checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  type: checkTypeEnum('type').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  interval: integer('interval').notNull(), // in minutes
  lastCheckedAt: timestamp('last_checked_at'),
  config: jsonb('config').default({}).notNull(), // e.g. { formUrl: string, fields: [{ name, value }], expectedText: string, pixels: string[] }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Historical results of monitoring checks.
 */
export const checkResults = pgTable('check_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  checkId: uuid('check_id').references(() => checks.id, { onDelete: 'cascade' }).notNull(),
  status: checkStatusEnum('status').notNull(),
  responseTime: integer('response_time'), // in milliseconds
  details: text('details'),
  screenshotUrl: text('screenshot_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Open or resolved incident logs representing downtime or validation failures.
 */
export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  checkResultId: uuid('check_result_id').references(() => checkResults.id, { onDelete: 'cascade' }).notNull(),
  severity: checkStatusEnum('severity').notNull(),
  issue: text('issue').notNull(),
  resolvedAt: timestamp('resolved_at'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Client reports table holding monthly summary records, generated PDFs, and AI-generated text.
 */
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  status: reportStatusEnum('status').default('draft').notNull(),
  pdfUrl: text('pdf_url'),
  aiSummary: text('ai_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Alert settings configurations for Slack webhooks, email lists, or SMS routing.
 */
export const alertSettings = pgTable('alert_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  channel: text('channel').notNull(), // 'email', 'slack', 'sms'
  config: jsonb('config').default({}).notNull(), // e.g. { webhookUrl: string, email: string, phone: string }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for easier query building
export const organizationsRelations = relations(organizations, ({ many }) => ({
  sites: many(sites),
  alertSettings: many(alertSettings),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sites.orgId],
    references: [organizations.id],
  }),
  checks: many(checks),
  incidents: many(incidents),
  reports: many(reports),
}));

export const checksRelations = relations(checks, ({ one, many }) => ({
  site: one(sites, {
    fields: [checks.siteId],
    references: [sites.id],
  }),
  results: many(checkResults),
}));

export const checkResultsRelations = relations(checkResults, ({ one, many }) => ({
  check: one(checks, {
    fields: [checkResults.checkId],
    references: [checks.id],
  }),
  incidents: many(incidents),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  site: one(sites, {
    fields: [incidents.siteId],
    references: [sites.id],
  }),
  result: one(checkResults, {
    fields: [incidents.checkResultId],
    references: [checkResults.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  site: one(sites, {
    fields: [reports.siteId],
    references: [sites.id],
  }),
}));

export const alertSettingsRelations = relations(alertSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [alertSettings.orgId],
    references: [organizations.id],
  }),
}));

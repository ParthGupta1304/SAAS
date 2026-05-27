# Maintly — Full SaaS Launch Plan

> **Mission:** Turn Maintly from a UI prototype into a revenue-generating AI-powered SaaS that helps agencies catch silent website failures and generate monthly proof-of-work reports.

---

## Competitive Landscape

### Direct Competitors

| Competitor | Type | Pricing | Strengths | What They're Missing |
|---|---|---|---|---|
| **UptimeRobot** | Uptime monitor | Free (50 monitors) → $7/mo Pro | Massive free tier, simple UI | No form testing, no tracking pixel detection, no agency reports |
| **Better Stack** | Incident mgmt | Free (10 monitors) → $25/mo | On-call, status pages, logging | No form testing, no agency branding, no portfolio view |
| **Pingdom** | Synthetic monitor | From $15/mo | Transaction monitoring, RUM | Enterprise pricing, no agency workflow, no care-plan reports |
| **StatusCake** | Uptime + SSL | Free (10 monitors) → £17/mo | SSL + domain monitoring | No form testing, no tracking pixels, no reporting |
| **Hexometer** | Website health | From $12/mo | SEO + broken links + AI | No form testing, no client-facing reports |

### Agency Tools (WordPress-Only)

| Competitor | Pricing | Limitation |
|---|---|---|
| **ManageWP** (GoDaddy) | Free + $1-2/site add-ons | WordPress only. No form testing, no proof-of-work reports |
| **MainWP** | Free core, $30-80/mo Pro | WordPress only. Self-hosted. Reporting is an add-on |

### Client Reporting Tools

| Competitor | Pricing | Limitation |
|---|---|---|
| **AgencyAnalytics** | $79-499/mo | Marketing metrics only (SEO, PPC, Social). No website health |
| **Whatagraph / DashThis** | $50-300/mo | Same gap — no uptime, SSL, form, or tracking data |

### Key Gaps Maintly Owns

| Gap | Who's Missing It | Maintly's Advantage |
|---|---|---|
| **Automated form submission testing** | ALL competitors | Only tool that submits forms, checks thank-you pages, captures failure screenshots |
| **Tracking pixel detection** | ALL monitoring tools | Detect missing GA4, GTM, Meta Pixel, LinkedIn Insight |
| **Client-safe proof-of-work reports** | ALL monitoring tools | AI-generated monthly PDFs in non-technical language with agency branding |
| **Agency-first portfolio dashboard** | Most tools are per-site | Single view of ALL client sites with risk scoring |
| **Platform-agnostic** | ManageWP/MainWP are WP-only | Works with ANY website (Webflow, Shopify, custom, static) |
| **Combined monitoring + reporting** | Separate tool categories | Replaces UptimeRobot + AgencyAnalytics ($86/mo) with one $49/mo tool |

### Market Intelligence

- Agencies charge **$50–$500/month per site** for care plans
- Global website monitoring market: **~$5-7B**, growing 15% CAGR
- Estimated **50,000–100,000 agencies** globally sell website care plans
- Trend: Agencies shifting to **recurring revenue** models need proof-of-value documentation

---

## Recommended Tech Stack

| Layer | Choice | Monthly Cost | Why |
|---|---|---|---|
| Framework | **Next.js 15** (App Router) | $0 | Already in use |
| Auth | **Clerk** | $0 | Already in use, 10K MAU free tier |
| Database | **Supabase** (Serverless Postgres) + **Drizzle ORM** | $0 | Generous free tier, 500MB DB + 5GB free storage |
| Hosting (Web) | **Vercel Pro** | $20 | Best Next.js support, edge functions |
| Hosting (Worker & Scheduler) | **Railway** | $5-10 | Persistent Node.js worker + scheduling + Playwright |
| Background Jobs | **Railway Scheduler (node-cron)** | $0 | Included in Railway worker, no third-party APIs |
| Email | **Resend** + React Email | $0 | 3K emails/mo free, component-based templates |
| Real-time Alerts | **Slack Webhooks** | $0 | Instant agency team notifications |
| Payments | **Lemon Squeezy** | 5% per txn | Merchant of Record — handles global tax/GST |
| PDF Reports | **React-PDF** | $0 | Server-side, no browser needed |
| Form Testing | **Playwright** (on Railway) | Included | Multi-browser, auto-wait, best reliability |
| AI Summaries | **Google Gemini 2.0 Flash** | ~$5 | $0.10/1M input tokens — cheapest quality option |
| Product Analytics | **PostHog** | $0 | 1M free events, session replay, feature flags |
| **Total MVP Cost** | | **~$30-35/mo** | |

---

## Revenue & Pricing Structure

### Pricing Tiers

| Plan | Price/mo | Annual (20% off) | Sites | Target | Included Features |
|---|---|---|---|---|---|
| **Free Trial** | $0 (14 days) | - | 3 sites | New agencies exploring the tool | Basic uptime/SSL/domain checks. In-app alerts. Per organization limit. |
| **Starter** | $19 | $15/mo | 10 sites | Freelancers starting out | Basic + Slack + PDF reports. *Add-ons available.* |
| **Growth** ⭐ | $49 | $39/mo | 50 sites | Small growing agencies | Starter + Form Testing on 5 sites. *Add-ons available.* |
| **Agency** | $99 | $79/mo | 150 sites | Active agency teams | All features + Form Testing (all sites) + White-labeling included. |
| **Scale** | $250 | $199/mo | 400 sites | Enterprise care providers | Everything included. Zero extra add-on costs. Priority support. |

### Revenue Projections

| Milestone | Customers | MRR | ARR |
|---|---|---|---|
| Month 3 (Beta) | 20 free beta users | $0 | $0 |
| Month 6 (Launch) | 50 paying (avg $55) | $2,750 | $33,000 |
| Month 12 | 200 paying (avg $65) | $13,000 | $156,000 |
| Month 18 | 500 paying (avg $70) | $35,000 | $420,000 |

### Revenue Levers

- **Annual billing discount** (20% off) → improved cash flow + lower churn
- **Overage charges** beyond tier limits ($1.50/extra site/mo)
- **Add-on: White-label reports** ($15/mo) — for Starter and Growth tiers
- **Add-on: Form Testing Booster** ($10/mo) — add automated form submissions to Starter, or expand count on Growth
- **Add-on: SMS alerts** ($9/mo) — Twilio integration for critical alerts
- **Enterprise custom** — unlimited sites, dedicated account manager, SLA

---

## Phased Roadmap

---

### Phase 1: Foundation (Weeks 1–3)

> **Goal:** Set up the database, data models, and core backend infrastructure.

- `[ ]` **1.1 — Database setup**
  - Set up Supabase project (PostgreSQL)
  - Install and configure Drizzle ORM
  - Define core schema:
    - `organizations` (linked to Clerk org ID)
    - `sites` (URL, name, client name, org_id)
    - `checks` (type: uptime/ssl/domain/form/tracking, site_id)
    - `check_results` (status, response_time, details, screenshot_url, check_id)
    - `incidents` (severity, site_id, check_result_id, resolved_at)
    - `reports` (month, year, site_id, status: draft/approved/sent, pdf_url)
    - `alert_settings` (channel: email/slack, org_id)
  - Write migration scripts

- `[ ]` **1.2 — API routes**
  - `POST /api/sites` — add a site to monitoring
  - `GET /api/sites` — list all sites for the org
  - `PATCH /api/sites/:id` — update site config
  - `DELETE /api/sites/:id` — remove site
  - `GET /api/dashboard/stats` — aggregated metrics for the org
  - `GET /api/incidents` — list open incidents
  - `GET /api/reports` — list reports for the org

- `[ ]` **1.3 — Connect dashboard to real data**
  - Replace static mock data in `app/dashboard/page.tsx` with server-side data fetching
  - Build an "Add Site" modal with form validation
  - Display real site list, stats, and incident feed

> **Deliverable:** A working dashboard that creates, lists, and manages real sites stored in Postgres.

---

### Phase 2: Monitoring Engine (Weeks 4–7)

> **Goal:** Build the automated monitoring checks that run on a schedule.

- `[ ]` **2.1 — Uptime checker**
  - HTTP HEAD/GET request to site URL
  - Measure response time and status code
  - Store results in `check_results`
  - Flag downtime (5xx, timeout, DNS failure) as incidents

- `[ ]` **2.2 — SSL certificate checker**
  - TLS handshake to extract certificate metadata
  - Calculate days until expiry
  - Generate warning incidents at 30/14/7 day thresholds

- `[ ]` **2.3 — Domain expiry checker**
  - WHOIS lookup or RDAP API query
  - Parse expiration date
  - Generate warning incidents at 60/30/14 day thresholds

- `[ ]` **2.4 — Tracking pixel detector**
  - Fetch homepage HTML
  - Search for known script patterns:
    - Google Analytics: `googletagmanager.com/gtag/js` or `google-analytics.com/analytics.js`
    - GTM: `googletagmanager.com/gtm.js`
    - Meta Pixel: `connect.facebook.net`
    - LinkedIn Insight: `snap.licdn.com`
  - Compare against expected configuration per site
  - Flag missing/broken pixels as incidents

- `[ ]` **2.5 — Contact form tester** ⭐ (Killer feature)
  - Use Playwright on Railway container
  - Navigate to the configured form URL
  - Fill form fields with test data (configurable per site)
  - Submit the form
  - Check for expected success message / thank-you page
  - Capture screenshot of the result
  - Store screenshot (Supabase Storage or S3) and link to check result

- `[ ]` **2.6 — Scheduling & Concurrency Engine (Railway Worker)**
  - Set up a persistent Express server with `node-cron`
  - Implement concurrent batching (e.g., executing checks in batches of 50 sites) to process 1,500+ sites in parallel without thread lag
  - Implement a queue-limited Playwright scheduler (maximum 2 browsers running concurrently) to prevent CPU spikes and Out-Of-Memory (OOM) crashes
  - Add retry logic for temporary connection failures
  - Enforce rate-limits per organization based on plan tier

> **Deliverable:** Fully automated monitoring engine that detects real failures across 5 check types.

---

### Phase 3: Alerts & Notifications (Weeks 8–9)

> **Goal:** Route incidents to the right people through the right channels.

- `[ ]` **3.1 — Alert routing engine**
  - When a check creates an incident, determine the notification targets
  - Support per-site or per-org alert configuration
  - De-duplicate alerts (don't spam for ongoing incidents)
  - Implement alert escalation (if unresolved after X hours, re-alert)

- `[ ]` **3.2 — Email alerts (Resend)**
  - Build React Email templates for:
    - Critical alert (form failure, site down)
    - Warning (SSL expiring, tracking missing)
    - Incident resolved confirmation
  - Send via Resend API

- `[ ]` **3.3 — Slack integration**
  - OAuth flow to connect agency's Slack workspace
  - Post formatted incident cards to a chosen channel
  - Include severity badge, site name, timestamp, and "View in Maintly" link

- `[ ]` **3.4 — In-app notification center**
  - Bell icon in dashboard header with unread count
  - Dropdown showing recent alerts with severity, time, and site
  - Mark as read / dismiss functionality

> **Deliverable:** Multi-channel alert routing with email, Slack, and in-app notifications.

---

### Phase 4: Reports & AI (Weeks 10–13)

> **Goal:** Generate client-facing monthly maintenance reports with AI summaries.

- `[ ]` **4.1 — Report data aggregation**
  - Compile monthly stats per site:
    - Total checks run
    - Uptime percentage
    - Incidents detected and resolved
    - SSL/domain renewal status
    - Tracking pixel health
    - Form test pass/fail rate
  - Store aggregated data in `reports` table

- `[ ]` **4.2 — AI-powered narrative generation**
  - Integrate Google Gemini 2.0 Flash API
  - Prompt template that converts raw metrics into client-safe language:
    - Input: JSON of site metrics, incidents, resolutions
    - Output: 2-3 paragraph executive summary
  - Example output: *"This month, your website maintained 99.97% uptime. Our team detected and resolved a contact form issue within 2 hours, and your SSL certificate was renewed 14 days before expiry."*
  - Allow manual editing before sending

- `[ ]` **4.3 — AI Playwright Form Auditor**
  - Integrate Gemini 2.0 Flash into the background worker queue (`worker/server.ts`)
  - Auto-discovery for contact fields: AI scans HTML forms, automatically resolves CSS selectors for key fields (Name, Email, Message) and submits them without manual selector mapping
  - AI Success Verification: AI analyzes the resulting DOM text to confirm confirmation state or log specific validation errors
  - Captcha/error logging hooks and screenshot uploads to Supabase Storage

- `[ ]` **4.4 — PDF report generation**
  - Build report layout with React-PDF:
    - Agency logo + branding colors (configurable)
    - Executive summary (AI-generated)
    - Metrics grid (uptime, checks, incidents)
    - Incident timeline with resolutions
    - Screenshot evidence for failures
    - Next month recommendations
  - Generate and store PDF (S3/Supabase Storage)

- `[ ]` **4.5 — Report workflow**
  - Auto-generate draft reports on the 1st of each month
  - Dashboard view: reports queue with Draft → Approved → Sent status
  - "Preview" button opens the rendered PDF
  - "Approve & Send" delivers the report via email to the client contact
  - Track opens (via Resend webhooks)

- `[ ]` **4.6 — Brand customizer**
  - Upload agency logo
  - Choose primary HSL color
  - Custom footer text
  - Optional: white-label (remove Maintly branding, add-on)

> **Deliverable:** Automated monthly PDF reports with AI narratives, agency branding, and a review workflow.

---

### Phase 5: Payments & Launch (Weeks 14–16)

> **Goal:** Monetize with subscription billing and launch publicly.

- `[ ]` **5.1 — Lemon Squeezy integration**
  - Set up Lemon Squeezy store with product variants matching pricing tiers
  - Implement checkout flow:
    - Free trial (14 days, no credit card required)
    - Monthly and annual billing options
  - Webhook handlers for:
    - `subscription_created` → activate org features
    - `subscription_updated` → change tier limits
    - `subscription_cancelled` → downgrade to free/limited
    - `subscription_payment_failed` → grace period + alert
  - Store subscription state in database, linked to Clerk org

- `[ ]` **5.2 — Plan enforcement**
  - Middleware/hook that checks org's active plan
  - Enforce limits:
    - Site count per plan
    - Check frequency (5-min for paid, 15-min for starter)
    - Report generation (unlimited for paid, 3/mo for starter)
    - Form testing (paid tiers only)
  - Upgrade prompts when hitting limits
  - Billing portal (manage plan, update payment, view invoices)

- `[ ]` **5.3 — Onboarding flow improvements**
  - Step 1: Create Clerk organization (existing)
  - Step 2: Add first site (with guided URL input + auto-detect checks)
  - Step 3: Configure alerts (email + optional Slack)
  - Step 4: Choose plan (or start free trial)
  - Progress indicator and skip options

- `[ ]` **5.4 — Landing page updates**
  - Replace prototype copy with real product messaging
  - Add real testimonials / early beta user quotes
  - Live demo mode (sandbox dashboard with sample data)
  - Add comparison table vs. competitors
  - Add trust signals (security badges, uptime guarantee)

- `[ ]` **5.5 — Launch checklist**
  - Legal: Terms of Service, Privacy Policy, DPA
  - SEO: Sitemap, meta tags, OG images
  - Analytics: PostHog setup for funnels (signup → onboarding → first site → paid conversion)
  - Error monitoring: Sentry integration
  - Status page: Public status page for Maintly itself

> **Deliverable:** Live, monetized product with subscription billing, free trials, and public launch.

---

### Phase 6: Growth & Moat (Months 5–12)

> **Goal:** Scale acquisition, deepen the moat, and expand features.

- `[ ]` **6.1 — SEO + Content marketing**
  - Blog: "How to sell website care plans", "What to include in a maintenance report"
  - Landing pages: "UptimeRobot alternative for agencies", "ManageWP alternative for non-WordPress"
  - YouTube: Dashboard walkthrough, setup tutorial

- `[ ]` **6.2 — Agency partner program**
  - Referral system: 20% recurring commission for agency referrals
  - Co-branded landing pages for large agency partners
  - "Powered by Maintly" badge for care plan websites

- `[ ]` **6.3 — Advanced monitoring**
  - Visual regression testing (screenshot diffing)
  - Page speed / Core Web Vitals tracking
  - Broken link detection
  - SEO meta tag monitoring
  - Content change detection

- `[ ]` **6.4 — Integrations marketplace**
  - WordPress plugin (auto-register sites from WP admin)
  - Webflow webhook integration
  - Zapier / Make.com triggers
  - Client portal (read-only dashboard for agency clients)

- `[ ]` **6.5 — Team features**
  - Role-based access (admin, editor, viewer)
  - Task assignment for incidents
  - Internal notes on incidents
  - Activity audit log

- `[ ]` **6.6 — Enterprise features**
  - SSO (SAML/OIDC)
  - Custom SLA agreements
  - Dedicated infrastructure
  - API access for custom integrations
  - Multi-region monitoring

> **Deliverable:** Sustainable growth engine with content, partnerships, and an expanding feature moat.

---

## How to Outthrow Competitors

### 1. Own the positioning
> No competitor targets "agency care plans" explicitly. UptimeRobot is for devs. AgencyAnalytics is for marketers. **Maintly is for maintenance agencies.** Every word of copy, every feature, every email should reinforce this.

### 2. Lead with the killer feature
> **Form testing is unique.** No monitoring tool automates contact form submissions and captures failure evidence. Lead every marketing message with: *"We submit your client's contact form every 6 hours. When it breaks, you know before the client does."*

### 3. Replace two tools with one
> Agencies currently use UptimeRobot ($7) + AgencyAnalytics ($79) = **$86/mo for monitoring + reporting**. Maintly Growth at **$49/mo** replaces both. The value proposition writes itself.

### 4. Make reports the retention engine
> Reports are how agencies justify retainers. If Maintly generates beautiful, AI-written reports with zero manual effort, agencies can't leave — the switching cost is too high.

### 5. AI as a differentiator, not a gimmick
> Competitors show raw metrics. Maintly translates them: *"SSL certificate expires in 11 days"* becomes *"We're renewing your security certificate ahead of schedule to ensure uninterrupted protection."* **The AI writes for the client, not the developer.**

### 6. Community-led growth
> Build a community around "selling maintenance" — the business model, not just the tool. Agencies helping agencies price, sell, and deliver care plans. Maintly becomes the default tool because it's embedded in the community.

---

## Timeline Summary

```
Weeks 1-3   ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1: Foundation
Weeks 4-7   ░░░░░░████████░░░░░░░░░░░░░░░░░░  Phase 2: Monitoring Engine
Weeks 8-9   ░░░░░░░░░░░░░░████░░░░░░░░░░░░░░  Phase 3: Alerts & Notifications
Weeks 10-13 ░░░░░░░░░░░░░░░░░░████████░░░░░░  Phase 4: Reports & AI
Weeks 14-16 ░░░░░░░░░░░░░░░░░░░░░░░░░░██████  Phase 5: Payments & Launch
Months 5-12 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 6: Growth & Moat (ongoing)
```

> **Total time to launch: ~4 months.** First paying customers by Month 4. $10K MRR target by Month 12.

# Implementation Plan: MVP Phases 3, 4, and 5

This plan covers the entire blueprint for completing the Maintly agency care plan SaaS:
*   **Phase 3: Alerts & Notifications** (Multi-channel de-duplicated alert routing via Resend Email, Slack Webhooks, and In-App feeds).
*   **Phase 4: Reports & AI** (Monthly report aggregation, Gemini 2.5 Flash narrative generation, PDF layouts, and the AI Playwright Form Auditor).
*   **Phase 5: Payments & Launch** (Lemon Squeezy billing sync, plan limits enforcement, guided onboarding, and deployment checks).

---

## User Review Required

> [!IMPORTANT]
> **Email Domain Authentication:** Using Resend to deliver status alerts to agency clients requires domain authentication (adding SPF/DKIM TXT records on your DNS). For local testing, we can use Resend's default testing domain (`onboarding@resend.dev`), which only sends to your own verified account email.
> 
> **Gemini 2.5 Flash API Key:** Integrating the AI elements requires your Google AI Studio API key (`GEMINI_API_KEY`) to be loaded in the `.env` file. We will configure the client to fail gracefully if the key is missing (e.g. falling back to simple template summaries).
> 
> **Lemon Squeezy Setup:** You will need to create a Lemon Squeezy Store (sandbox mode is fine for testing) and set up subscription products to connect webhooks.

---

## Proposed Changes

We will group changes logically by phase.

---

### PHASE 3: ALERTS & NOTIFICATIONS

This phase ensures that detected site incidents are routed to the agency team immediately without spamming.

#### 3.1 — Alert Routing Engine
We will create a helper module to handle alert distribution and de-duplication:
*   **Helper file [alert-router.ts](file:///Users/parthgupta/Desktop/SAAS/lib/alerts/alert-router.ts):** When an incident is logged, the worker calls the router. 
*   **De-duplication:** Check if there is an active (unresolved) incident of the same type for the site. If yes, suppress subsequent alerts to prevent notification fatigue.
*   **Escalation:** Re-send alert notification only if the incident remains unresolved for a configured period (e.g. 12 hours).

#### 3.2 — Email Alerts (Resend)
*   **Helper file [email.ts](file:///Users/parthgupta/Desktop/SAAS/lib/alerts/email.ts):** Encapsulates Resend SDK.
*   **Templates:** Create React Email components under `/components/emails/` for:
    *   `critical-alert.tsx` (site offline, form test failed).
    *   `warning-alert.tsx` (SSL expiring, missing tracking pixel).
    *   `resolution-alert.tsx` (confirming site is back online/resolved).

#### 3.3 — Slack Integration
*   **API Route [settings/slack/route.ts](file:///Users/parthgupta/Desktop/SAAS/app/api/settings/slack/route.ts):** Saves Slack Webhook URLs under the `alert_settings` table.
*   **Formatter [slack.ts](file:///Users/parthgupta/Desktop/SAAS/lib/alerts/slack.ts):** Formats alert payloads into rich Slack Block Kit layout cards featuring:
    *   Severity badges (colors: Red for critical, Yellow for warnings, Green for resolutions).
    *   Site details, error logs, and direct buttons linking to the Maintly dashboard.

#### 3.4 — In-App Notification Center
We will add an interactive notification tray in the header:
*   **New API endpoint [api/notifications/route.ts](file:///Users/parthgupta/Desktop/SAAS/app/api/notifications/route.ts):** Queries recent incident events for the organization and handles PATCH requests to mark logs as read.
*   **Header Component [notification-bell.tsx](file:///Users/parthgupta/Desktop/SAAS/components/notification-bell.tsx):** Client component showing an unread bell badge, opening a glassmorphic dropdown with scrollable logs, and a "Mark all as read" button.

---

### PHASE 4: REPORTS & AI

This phase aggregates monthly metrics and leverages Gemini 2.5 Flash to write client-facing reports and audit contact forms.

#### 4.1 — Report Data Aggregation
*   **Scheduler Job (`worker/server.ts`):** Scheduled to run on the 1st of every month. It aggregates the previous month's metrics per site (Uptime %, resolved incidents count, tracking tag state) and creates draft rows in the `reports` table.

#### 4.2 — AI Narrative Generation
*   **Helper file [gemini.ts](file:///Users/parthgupta/Desktop/SAAS/lib/ai/gemini.ts):** Connects to `@google/generative-ai` SDK.
*   **Summarizer:** Feeds monthly JSON metrics into Gemini 2.5 Flash to generate a 2-paragraph client-friendly executive summary translating technical data into value delivery narrative.

#### 4.3 — AI Playwright Form Auditor
*   **Integrate in worker [worker/server.ts](file:///Users/parthgupta/Desktop/SAAS/worker/server.ts):**
    *   When evaluating a form check, instead of rigid configurations, we feed the simplified form DOM elements to Gemini 2.5 Flash.
    *   The AI matches semantic inputs (e.g. identifying that `id="custEmail"` represents email) and returns the CSS selector map.
    *   Playwright fills out and submits the form, takes a screenshot, and passes the resulting success/error screen text to Gemini to classify as `success` or `failure`.

#### 4.4 — PDF Generation (React-PDF)
*   **Helper file [pdf-generator.ts](file:///Users/parthgupta/Desktop/SAAS/lib/reports/pdf-generator.ts):** Uses `@react-pdf/renderer` to generate a branded, clean PDF layout containing:
    *   Agency custom branding color and logo header.
    *   Gemini-generated executive summary.
    *   Visual grid comparing Uptime, SSL validity, and form success rates.
    *   Screenshot evidence of form checks or resolved incidents.

#### 4.5 — Report Workflow Dashboard
*   **UI Page [dashboard/reports/page.tsx](file:///Users/parthgupta/Desktop/SAAS/app/dashboard/reports/page.tsx):** Display a grid of monthly reports (Drafts, Approved, Sent).
*   **Preview Modal:** Uses browser native PDF viewers to let agency owners review and edit Gemini's narratives.
*   **Send Action:** Delivers the approved PDF attachment to the client's email via Resend.

---

### PHASE 5: PAYMENTS & LAUNCH

This phase implements billing, guided setup onboarding, and production deployment parameters.

#### 5.1 — Lemon Squeezy Integration
*   **API Webhook [api/billing/webhook/route.ts](file:///Users/parthgupta/Desktop/SAAS/app/api/billing/webhook/route.ts):** Listens to Lemon Squeezy subscription events (`subscription_created`, `subscription_cancelled`, `subscription_updated`) and synchronizes plan types (`trial`, `starter`, `growth`, `agency`, `scale`) and site limits on our `organizations` database table.

#### 5.2 — Onboarding Flow Upgrades
*   **Multi-step layout [app/onboarding/page.tsx](file:///Users/parthgupta/Desktop/SAAS/app/onboarding/page.tsx):**
    *   **Step 1:** Create or join a Clerk Organization.
    *   **Step 2:** Add your first website domain.
    *   **Step 3:** Choose your care subscription tier (Lemon Squeezy checkout integration).

#### 5.3 — SEO & Production Optimizations
*   **Metadata Config:** Add standard OpenGraph/Twitter cards in Next.js layout configurations.
*   **Sitemap & Robots:** Add dynamic sitemaps and search indexing rules.
*   **PostHog Analytics:** Integrate PostHog inside layouts for funnels and telemetry tracking.

---

## Verification Plan

### Automated / API Verification
*   **Mock Webhook Tester:** Use cURL or Postman to send mock Lemon Squeezy JSON payloads to `/api/billing/webhook` and verify the organization table is updated correctly.
*   **Manual Trigger Routes:** Expose temporary API testing triggers to generate draft PDF reports on demand to check page boundaries and format styles.
*   **Resend Log Audits:** Verify in the Resend developer console that emails are formatted correctly and trace deliverability statuses.

### Manual Verification
*   **Slack Integration:** Add a test Slack channel webhook, trigger an uptime check failure, and confirm the Block Kit layouts format and display cleanly.
*   **Multi-Browser Check:** Test onboarding wizard steps across Chrome, Safari, and Firefox.

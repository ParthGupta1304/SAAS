# Project Summary: Agency Site Guard

**Agency Site Guard** is a highly polished, modern Next.js SaaS web application designed specifically for agencies selling website care plans. It helps agencies catch silent website failures (such as form submission errors, expiring SSL certificates, DNS changes, and missing tracking pixels) before their clients do. It also allows agencies to easily generate monthly "proof-of-work" reports to justify retainer costs.

---

## 🛠️ Tech Stack & Dependencies

The project is built using modern React and Next.js features, focusing on visual excellence, motion, and authentication:

- **Framework**: [Next.js (v15.0.4)](https://nextjs.org/) utilizing the **App Router** for layout structuring and routing.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for static typing.
- **Styling**: [Tailwind CSS (v3.4.16)](https://tailwindcss.com/) with a dark-mode focus, paired with custom configuration in [tailwind.config.ts](file:///Users/parthgupta/Documents/SAAS/tailwind.config.ts) and custom layout rules in [globals.css](file:///Users/parthgupta/Documents/SAAS/app/globals.css).
- **Authentication & Multi-Tenancy**: [@Clerk/Nextjs (v7.4.1)](https://clerk.com/) for secure authentication, user profiles, session state, and organization management.
- **Animations**: [Framer Motion (v12.23.24)](https://www.framer.com/motion/) for premium micro-animations, layout transitions, and interactive visual elements.
- **Data Visualization**: [Recharts (v2.13.3)](https://recharts.org/) for operational dashboard metrics and interactive charts (e.g., uptime charts, status distributions).
- **Icons**: [Lucide React (v0.468.0)](https://lucide.dev/) for high-quality SVG iconography.

---

## 📁 File Structure and Architecture

```
agency-site-guard/
├── app/                        # Next.js App Router root
│   ├── dashboard/              # Protected agency operations dashboard
│   │   └── page.tsx            # Main operational view with stats, feeds, and team views
│   ├── onboarding/             # Protected setup flow for creating/choosing workspaces
│   │   └── page.tsx            # Clerk organization registration/selection shell
│   ├── sign-in/[[...sign-in]]/ # Clerk sign-in routes
│   │   └── page.tsx            # Authentication shell and SignIn component
│   ├── sign-up/[[...sign-up]]/ # Clerk sign-up routes
│   │   └── page.tsx            # Registration shell and SignUp component
│   ├── globals.css             # Global styles, variables, background grids, glassmorphism
│   ├── layout.tsx              # Root HTML wrapper and ClerkProvider setup
│   └── page.tsx                # Polished landing page with interactive static prototypes
├── components/                 # Shared UI Components
│   ├── auth-shell.tsx          # Consistent premium side-by-side layout for auth pages
│   └── clerk-setup-card.tsx    # Fallback instructions shown when Clerk keys are missing
├── lib/                        # Helpers and Configurations
│   └── clerk.ts                # Clerk configuration check and export states
├── middleware.ts               # Next.js middleware enforcing Clerk route-based protection
├── tailwind.config.ts          # Custom Tailwind configuration (colors, shadows, fonts)
└── package.json                # Project dependencies and npm scripts
```

---

## 🔑 Authentication Architecture (Clerk Integration)

Authentication is handled securely via **Clerk**. An agency owner signs up as a user, and then creates or joins an **Organization**, which serves as the shared workspace for their agency team.

### Route Protection:
- **Public Routes**: `/` (Landing Page), `/sign-in`, `/sign-up`.
- **Protected Routes**: `/dashboard` and `/onboarding` (enforced in `middleware.ts`).

### Smart Fallback Architecture:
If the required Clerk environment variables are not set in the `.env` file, the application does not crash. It includes fallback logic to detect if Clerk publishable and secret keys are available (`lib/clerk.ts`):
1. **Middleware Bypass**: If `isClerkConfigured` is `false`, the middleware allows unrestricted access to all routes (e.g., for local layout previewing).
2. **Setup Prompt**: If keys are missing, the sign-in, sign-up, and dashboard pages render a beautiful [ClerkSetupCard](file:///Users/parthgupta/Documents/SAAS/components/clerk-setup-card.tsx) explaining how to add the necessary keys to `.env`.
3. **Provider Wrapper**: `RootLayout` only wraps the children in `ClerkProvider` if Clerk frontend is ready, ensuring that there are no runtime provider errors when running without credentials.

---

## 🎨 Design System & Visual Aesthetics

The application implements a premium, dark-mode glassmorphic theme.

### 1. Typography
Integrated variable fonts from Google Fonts:
- **Body Text**: `Inter Variable` (via `@fontsource-variable/inter`).
- **Heading / Display Text**: `Space Grotesk Variable` (via `@fontsource-variable/space-grotesk`).

### 2. Tailored Color Palette
Uses a curated HSL color set (`tailwind.config.ts`):
- **Background**: Dark charcoal-blue (`#080c14` / `hsl(222, 34%, 6%)`).
- **Accent Elements**: Vibrant Cyan and Emerald.
- **Glassmorphism**: Border opacity (`white/10`) coupled with light white background tint (`bg-white/[0.045]`), customized shadow (`shadow-panel`), and high-value backdrop blur (`backdrop-blur-xl`).

### 3. Visual Accents
- **Soft Grid Background**: Custom CSS background grid pattern (`.soft-grid` in `globals.css`) layered at low opacity.
- **Ambient Glows**: Blur-filtered radial gradients (using cyan and emerald blobs) placed strategically behind content shells to create depth.
- **Gradient Highlights**: Interactive elements and CTA containers have linear gradient borders and background transitions.

---

## 🖥️ Page Walkthroughs

### 1. Landing Page (`app/page.tsx`)
A highly interactive, single-page website structured similarly to modern Framer designs:
- **Hero Area**: An elegant catchphrase, waitlist CTA buttons, and a responsive product mockup of the dashboard.
- **Interactive Demos**:
  - **Live Portfolio Map**: Simulates monitoring 148 sites with color-coded status badges and detailed metrics (uptime, SSL status, form status).
  - **Animated Charts**: Interactive Recharts components visualizing portfolio health over 7 days (AreaChart) and status distribution (PieChart).
  - **Static Components**: Implemented versions of the `SitesTable`, `IncidentInbox`, `SiteDetailCard` (with simulated form error screenshot), and billing mockups.
- **Pricing & FAQs**: Plan selection with interactive monthly/yearly billing toggle, and animated accordion menus for FAQs.

### 2. Onboarding Page (`app/onboarding/page.tsx`)
- Triggered if an authenticated user does not have an active organization.
- Implements Clerk's `<OrganizationList />` widget, prompting users to either create a new agency organization or switch to an existing one.

### 3. Dashboard Page (`app/dashboard/page.tsx`)
The operational cockpit once an agency workspace is authenticated and configured:
- **Header**: Features the `OrganizationSwitcher` and `UserButton` from Clerk, enabling seamless tenant switching.
- **Operational Metrics**: Displays cards for monitored sites, checks passing rate, open alerts count, and due reports.
- **Incident Feed**: Real-time mock notifications (e.g., checkout failures, expiring certificates).
- **Work Queue**: Tasks for the agency team (e.g., approving monthly summaries, routing alerts).

---

## 🚀 Future Implementation Roadmaps

To turn this UI-only prototype into a functional software-as-a-service application:
1. **Database Integration**: Connect a database (e.g., PostgreSQL, Prisma, Supabase) to persist agency workspaces, monitored site lists, checks config, and alert histories.
2. **Monitoring Engine**: Build a background worker service (using cron jobs, serverless functions, or a queue system like BullMQ) to run periodic checks:
   - **Uptime**: Ping HTTP endpoints.
   - **Form Verification**: Headless browser automation (e.g., Playwright/Puppeteer) to navigate, fill out contact forms, submit them, and check for success messages.
   - **SSL/Domain Check**: Queries to SSL endpoints and WHOIS services.
3. **Alert Routing**: Connect notifications with Slack Webhooks, email services (e.g., Resend), and SMS alerts.
4. **Report Generator**: Compile uptime and incident statistics into customizable PDFs using React-PDF or a screenshot rendering service.

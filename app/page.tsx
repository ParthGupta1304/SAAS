"use client";

/**
 * Maintly Landing Page & Client Portal Mockup.
 * Implements a high-fidelity, interactive product story using Framer Motion and Recharts:
 * 
 * UI/UX Motion Upgrades:
 * - Word-by-word text slide in header (StaggerText) using spring physics.
 * - 3D scroll perspective on the main product mockup (rotateX, scale, and opacity maps linked to page scroll progress).
 * - Spotlight hover effects (HoverPanel) calculating cursor coordinates as CSS variables for radial gradient glow.
 * - Dynamic billing frequency toggle (monthly vs. yearly with 20% discount layout transitions).
 * - Animated FAQ accordions using Framer Motion AnimatePresence and height interpolation.
 * - Mobile responsive navigation menu slide and fade triggers.
 */

import Link from "next/link";
import {
  OrganizationSwitcher,
  Show,
  UserButton,
  useAuth
} from "@clerk/nextjs";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Command,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Menu,
  MonitorCheck,
  Palette,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { MotionValue, Variants } from "framer-motion";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Reports", href: "#reports" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" }
];

const sidebarItems: Array<{ icon: LucideIcon; label: string; active: boolean }> = [
  { icon: Activity, label: "Overview", active: true },
  { icon: Globe, label: "Sites", active: false },
  { icon: Bell, label: "Alerts", active: false },
  { icon: FileText, label: "Reports", active: false },
  { icon: Palette, label: "Branding", active: false },
  { icon: Settings, label: "Settings", active: false }
];

const stats = [
  { label: "Monitored sites", value: "148", change: "+18 this month", icon: Globe },
  { label: "Healthy", value: "132", change: "89.1% portfolio", icon: ShieldCheck },
  { label: "Active incidents", value: "6", change: "3 client-facing", icon: AlertTriangle },
  { label: "Reports queued", value: "41", change: "May cycle", icon: FileText }
];

const sites = [
  {
    name: "Acme Studio",
    url: "acmestudio.co",
    client: "Acme Studio",
    status: "Form failing",
    tone: "red",
    uptime: "99.94%",
    ssl: "82 days",
    domain: "211 days",
    form: "Failing",
    owner: "Maya"
  },
  {
    name: "Northstar Dental",
    url: "northstardental.com",
    client: "Northstar Dental",
    status: "Healthy",
    tone: "emerald",
    uptime: "99.99%",
    ssl: "64 days",
    domain: "144 days",
    form: "Passing",
    owner: "Arjun"
  },
  {
    name: "BrightPath Legal",
    url: "brightpathlegal.com",
    client: "BrightPath Legal",
    status: "SSL warning",
    tone: "amber",
    uptime: "99.88%",
    ssl: "11 days",
    domain: "98 days",
    form: "Passing",
    owner: "Maya"
  },
  {
    name: "UrbanNest Realty",
    url: "urbannest.co",
    client: "UrbanNest Realty",
    status: "Tracking missing",
    tone: "cyan",
    uptime: "99.97%",
    ssl: "39 days",
    domain: "301 days",
    form: "Passing",
    owner: "Dev"
  }
];

const incidents = [
  { issue: "Contact form confirmation missing", site: "Acme Studio", time: "8m ago", severity: "Critical" },
  { issue: "SSL certificate expires in 11 days", site: "BrightPath Legal", time: "1h ago", severity: "Warning" },
  { issue: "Meta Pixel not detected", site: "UrbanNest Realty", time: "3h ago", severity: "Watch" },
  { issue: "Homepage response time above 2.5s", site: "Northstar Dental", time: "Yesterday", severity: "Info" }
];

const chartData = [
  { day: "Mon", uptime: 99.92, checks: 642 },
  { day: "Tue", uptime: 99.98, checks: 658 },
  { day: "Wed", uptime: 99.9, checks: 649 },
  { day: "Thu", uptime: 99.99, checks: 676 },
  { day: "Fri", uptime: 99.95, checks: 681 },
  { day: "Sat", uptime: 99.97, checks: 612 },
  { day: "Sun", uptime: 99.96, checks: 608 }
];

const statusData = [
  { name: "Healthy", value: 132, color: "#34d399" },
  { name: "Warning", value: 10, color: "#fbbf24" },
  { name: "Down", value: 2, color: "#fb7185" },
  { name: "Watch", value: 4, color: "#22d3ee" }
];

const plans = [
  { 
    name: "Starter", 
    price: "$19", 
    sites: "10 sites", 
    description: "For freelancers starting out with a few retainers.",
    features: [
      "10 sites monitoring",
      "Uptime + SSL + domain checks",
      "In-app & Slack alerts",
      "PDF client reports",
      "Add-on: White-label (+$15/mo)",
      "Add-on: Form Testing (+$10/mo)"
    ]
  },
  { 
    name: "Growth", 
    price: "$49", 
    sites: "50 sites", 
    description: "For growing agencies proving monthly value.", 
    popular: true,
    features: [
      "50 sites monitoring",
      "Uptime + SSL + domain checks",
      "In-app & Slack alerts",
      "PDF client reports",
      "Form Testing (on 5 sites)",
      "Add-on: White-label (+$15/mo)"
    ]
  },
  { 
    name: "Agency", 
    price: "$99", 
    sites: "150 sites", 
    description: "For established teams wanting full automation.",
    features: [
      "150 sites monitoring",
      "Uptime + SSL + domain checks",
      "In-app & Slack alerts",
      "PDF client reports",
      "Form Testing (all sites)",
      "White-labeling included",
      "SMS alerts add-on available"
    ]
  },
  { 
    name: "Scale", 
    price: "$250", 
    sites: "400 sites", 
    description: "For large white-label maintenance operations.",
    features: [
      "400 sites monitoring",
      "Uptime + SSL + domain checks",
      "In-app & Slack alerts",
      "PDF client reports",
      "Form Testing (all sites)",
      "White-labeling included",
      "SMS alerts included",
      "Priority 24/7 support"
    ]
  }
];

const sections: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.22], [0, -70]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.18], [0.52, 0.12]);
  const discountedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        displayPrice:
          billing === "yearly" && plan.price !== "Custom"
            ? `$${Math.round(Number(plan.price.replace("$", "")) * 0.8)}`
            : plan.price
      })),
    [billing]
  );

  return (
    <main className="relative overflow-hidden bg-[#070b12] text-zinc-50">
      <motion.div
        style={{ opacity: glowOpacity }}
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(circle_at_50%_10%,rgba(34,211,238,0.28),transparent_48%),radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.16),transparent_34%)]"
      />
      <div className="pointer-events-none fixed inset-0 z-0 soft-grid opacity-60" />
      <Header
        clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <Hero
        clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
        heroY={heroY}
      />
      <LogoStrip />
      <ProductSection />
      <WorkflowSection />
      <DashboardSection billing={billing} setBilling={setBilling} discountedPlans={discountedPlans} />
      <ReportsSection />
      <PricingSection billing={billing} setBilling={setBilling} discountedPlans={discountedPlans} />
      <FAQSection />
      <CTASection clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
      <Footer />
    </main>
  );
}

function Header({
  clerkEnabled,
  menuOpen,
  setMenuOpen
}: {
  clerkEnabled: boolean;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070b12]/76 backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-sm font-semibold tracking-normal">Maintly</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <DesktopHeaderActions clerkEnabled={clerkEnabled} />
        <button
          className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/5 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#070b12] md:hidden"
          >
            <nav className="section-shell grid gap-2 py-4">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <MobileHeaderActions clerkEnabled={clerkEnabled} onNavigate={() => setMenuOpen(false)} />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function StaggerText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: delay } }
  };
  const child = {
    hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, damping: 18, stiffness: 200 }
    }
  };
  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("inline-flex flex-wrap justify-center gap-x-[0.3em] gap-y-1", className)}
    >
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={child} className="inline-block">
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

function Hero({ clerkEnabled, heroY }: { clerkEnabled: boolean; heroY: MotionValue<number> }) {
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: mockupProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"]
  });
  const rotateX = useTransform(mockupProgress, [0, 0.45], [12, 0]);
  const mockupScale = useTransform(mockupProgress, [0, 0.45], [0.92, 1]);
  const mockupOpacity = useTransform(mockupProgress, [0, 0.25], [0.5, 1]);

  return (
    <section id="top" className="relative z-10 pt-28 sm:pt-32">
      <div className="section-shell">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100"
          >
            <Sparkles className="size-4 text-cyan-300" />
            Built for agencies selling website care plans
          </motion.div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
            <StaggerText text="Catch silent website failures before your clients do." delay={0.1} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.68, delay: 0.6 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-300"
          >
            Uptime, SSL, domain, form, tracking, and client-ready maintenance reports for agencies
            that need proof-of-work without manual screenshots.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.68, delay: 0.75 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <HeroActions clerkEnabled={clerkEnabled} />
          </motion.div>
        </div>
        <div ref={mockupRef} className="perspective-container mx-auto mt-14 max-w-6xl">
          <motion.div
            style={{ rotateX, scale: mockupScale, opacity: mockupOpacity, y: heroY }}
            className="will-change-transform"
          >
            <ProductMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const items = ["Webflow agencies", "WordPress care plans", "Shopify retainers", "Local SEO teams", "White-label maintenance"];
  return (
    <section className="relative z-10 py-12">
      <div className="section-shell">
        <div className="mask-fade overflow-hidden border-y border-white/10 py-4">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="flex w-max gap-8 whitespace-nowrap text-sm text-zinc-400"
          >
            {[...items, ...items, ...items, ...items].map((item, index) => (
              <span key={`${item}-${index}`} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  const features = [
    {
      title: "Form checks that prove lead flow",
      text: "Submit test forms, confirm thank-you states, and capture failure evidence your client can understand.",
      icon: MonitorCheck
    },
    {
      title: "Expiry monitoring before panic",
      text: "Track domains, SSL certificates, DNS health, and renewal windows with agency-friendly alerts.",
      icon: Lock
    },
    {
      title: "Client-safe incident language",
      text: "Turn technical failures into calm, monthly proof that your team protected the website.",
      icon: FileText
    }
  ];

  return (
    <motion.section
      id="product"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <SectionHeader
          eyebrow="Product"
          title="The care-plan cockpit your clients never see, but always feel."
          text="Inspired by modern Framer landing pages, but tuned for operational clarity: animated panels, real metrics, and proof-of-work moments."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <HoverPanel className="min-h-[520px] overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Live portfolio map</p>
                  <h3 className="mt-1 text-xl font-semibold">148 sites monitored across 31 clients</h3>
                </div>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">All systems watching</span>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {sites.map((site) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={site.name}
                  className="rounded-lg border border-white/10 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">{site.url}</p>
                    </div>
                    <StatusBadge tone={site.tone}>{site.status}</StatusBadge>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                    <MetricChip label="Uptime" value={site.uptime} />
                    <MetricChip label="SSL" value={site.ssl} />
                    <MetricChip label="Form" value={site.form} />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mx-5 mb-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-cyan-100">AI-ready report summary</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">
                    “We caught and documented one lead form failure, one certificate warning, and four
                    performance dips before they affected your campaign.”
                  </p>
                </div>
                <button className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950">
                  Preview report
                </button>
              </div>
            </div>
          </HoverPanel>
          <div className="grid gap-4">
            {features.map((feature) => (
              <HoverPanel key={feature.title} className="p-5">
                <feature.icon className="size-5 text-cyan-300" />
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.text}</p>
              </HoverPanel>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function WorkflowSection() {
  const steps = [
    ["Connect", "Add client sites, form URLs, expected success messages, and branded report settings."],
    ["Watch", "Run scheduled checks for uptime, forms, tracking scripts, SSL, domains, and broken pages."],
    ["Explain", "Convert failures into evidence, screenshots, timestamps, and client-safe incident notes."],
    ["Report", "Send monthly maintenance proof that keeps retainers easy to justify."]
  ];
  return (
    <motion.section
      id="workflow"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <SectionHeader
          eyebrow="Workflow"
          title="A one-page product story built like a Framer launch site."
          text="The nav anchors scroll to each conversion moment, while the product panels keep showing real Maintly use cases."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map(([title, text], index) => (
            <motion.div
              key={title}
              whileHover={{ y: -6 }}
              className="relative rounded-lg border border-white/10 bg-white/[0.045] p-5"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-white/8 text-sm text-cyan-200">
                0{index + 1}
              </span>
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function DashboardSection({
  billing,
  setBilling,
  discountedPlans
}: {
  billing: "monthly" | "yearly";
  setBilling: (value: "monthly" | "yearly") => void;
  discountedPlans: Array<(typeof plans)[number] & { displayPrice: string }>;
}) {
  return (
    <motion.section
      id="dashboard"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <SectionHeader
          eyebrow="Dashboard"
          title="A dark command center for agencies managing dozens of client sites."
          text="Static prototype screens are embedded on the same page: dashboard, sites, incidents, reports, and settings."
        />
        <div className="mt-10 overflow-hidden rounded-lg border border-white/10 bg-[#0a0f19] shadow-glow">
          <div className="grid min-h-[740px] lg:grid-cols-[260px_1fr]">
            <aside className="border-b border-white/10 bg-white/[0.035] p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-emerald-300/10 text-emerald-300">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Northstar Agency</p>
                    <p className="text-xs text-zinc-500">Growth workspace</p>
                  </div>
                </div>
                <ChevronDown className="size-4 text-zinc-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-500">
                <Search className="size-4" />
                Search sites, reports...
                <Command className="ml-auto size-3" />
              </div>
              <nav className="mt-5 grid gap-1">
                {sidebarItems.map(({ icon: Icon, label, active }) => (
                  <button
                    key={label}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                      active ? "bg-cyan-300/10 text-cyan-100" : "text-zinc-400 hover:bg-white/6 hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </aside>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-zinc-400">May 26, 2026</p>
                  <h2 className="mt-1 text-2xl font-semibold">Portfolio health overview</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                    Export PDF
                  </button>
                  <button className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-zinc-950">
                    Add site
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between">
                      <stat.icon className="size-5 text-cyan-300" />
                      <span className="text-xs text-zinc-500">{stat.change}</span>
                    </div>
                    <p className="mt-6 text-3xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Uptime and check volume</h3>
                      <p className="text-sm text-zinc-500">Last 7 days across all clients</p>
                    </div>
                    <StatusBadge tone="emerald">99.95% avg</StatusBadge>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="uptime" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.48} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ffffff12" vertical={false} />
                        <XAxis dataKey="day" stroke="#71717a" tickLine={false} axisLine={false} />
                        <YAxis domain={[99.8, 100]} stroke="#71717a" tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "#090e17",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            color: "#fff"
                          }}
                        />
                        <Area dataKey="uptime" type="monotone" stroke="#22d3ee" fill="url(#uptime)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <h3 className="font-semibold">Status distribution</h3>
                  <p className="text-sm text-zinc-500">Portfolio risk mix</p>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={4}>
                          {statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm text-zinc-400">
                        <span className="size-2 rounded-full" style={{ background: item.color }} />
                        {item.name}: {item.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                <SitesTable />
                <IncidentInbox />
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <SiteDetailCard />
                <SettingsMock billing={billing} setBilling={setBilling} discountedPlans={discountedPlans} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function SitesTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div>
          <h3 className="font-semibold">Monitored sites</h3>
          <p className="text-sm text-zinc-500">Filterable static table preview</p>
        </div>
        <button className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
          Filter
        </button>
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Uptime</th>
              <th className="px-4 py-3 font-medium">SSL</th>
              <th className="px-4 py-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.name} className="border-b border-white/8 last:border-0">
                <td className="px-4 py-4">
                  <p className="font-medium text-white">{site.name}</p>
                  <p className="text-xs text-zinc-500">{site.url}</p>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge tone={site.tone}>{site.status}</StatusBadge>
                </td>
                <td className="px-4 py-4 text-zinc-300">{site.uptime}</td>
                <td className="px-4 py-4 text-zinc-300">{site.ssl}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/8 text-xs">
                    {site.owner[0]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncidentInbox() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Alert inbox</h3>
          <p className="text-sm text-zinc-500">Evidence-ready incident groups</p>
        </div>
        <Bell className="size-5 text-cyan-300" />
      </div>
      <div className="mt-4 grid gap-3">
        {incidents.map((incident) => (
          <motion.div
            whileHover={{ x: 3 }}
            key={incident.issue}
            className="rounded-lg border border-white/10 bg-zinc-950/60 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{incident.issue}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {incident.site} · {incident.time}
                </p>
              </div>
              <StatusBadge tone={incident.severity === "Critical" ? "red" : incident.severity === "Warning" ? "amber" : "cyan"}>
                {incident.severity}
              </StatusBadge>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SiteDetailCard() {
  const checks = [
    ["Uptime", "Passing", "emerald"],
    ["SSL", "82 days", "emerald"],
    ["Domain", "211 days", "emerald"],
    ["Contact form", "Failing", "red"],
    ["GA4", "Detected", "emerald"],
    ["Meta Pixel", "Missing", "amber"]
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Site detail preview</p>
          <h3 className="mt-1 text-xl font-semibold">Acme Studio</h3>
          <p className="mt-1 text-sm text-zinc-400">Contact form failure caught 8 minutes ago</p>
        </div>
        <StatusBadge tone="red">Needs attention</StatusBadge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {checks.map(([label, value, tone]) => (
          <div key={label} className="rounded-md border border-white/10 bg-zinc-950/60 p-3">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className={cn("mt-2 text-sm font-medium", tone === "red" && "text-rose-300", tone === "amber" && "text-amber-200", tone === "emerald" && "text-emerald-200")}>
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Failure screenshot evidence</p>
          <ExternalLink className="size-4 text-zinc-500" />
        </div>
        <div className="grid h-40 place-items-center rounded-md border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(244,63,94,0.12),rgba(34,211,238,0.08))]">
          <div className="text-center">
            <AlertTriangle className="mx-auto size-7 text-rose-300" />
            <p className="mt-2 text-sm text-zinc-300">Thank-you message not found</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsMock({
  billing,
  setBilling,
  discountedPlans
}: {
  billing: "monthly" | "yearly";
  setBilling: (value: "monthly" | "yearly") => void;
  discountedPlans: Array<(typeof plans)[number] & { displayPrice: string }>;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Branding and billing</p>
          <h3 className="mt-1 text-xl font-semibold">Client report setup</h3>
        </div>
        <div className="flex rounded-md border border-white/10 bg-zinc-950/70 p-1">
          {(["monthly", "yearly"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setBilling(item)}
              className={cn(
                "relative rounded px-3 py-1.5 text-xs capitalize transition-colors",
                billing === item ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {billing === item && (
                <motion.div
                  layoutId="settings-pill"
                  className="absolute inset-0 rounded bg-cyan-300"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
          <p className="text-sm text-zinc-400">Report theme</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="size-8 rounded-full bg-cyan-300" />
            <span className="size-8 rounded-full bg-emerald-300" />
            <span className="size-8 rounded-full bg-zinc-200" />
          </div>
          <div className="mt-5 h-24 rounded-md border border-white/10 bg-white/[0.06] p-3">
            <p className="text-xs text-zinc-500">Northstar Agency</p>
            <p className="mt-2 text-sm font-medium">Monthly Site Health Report</p>
            <div className="mt-3 h-2 rounded-full bg-cyan-300/80" />
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
          <p className="text-sm text-zinc-400">Current plan</p>
          <p className="mt-4 text-3xl font-semibold">{discountedPlans[1].displayPrice}</p>
          <p className="mt-1 text-sm text-zinc-500">Growth · 50 sites</p>
          <button className="mt-5 w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950">
            Manage plan
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsSection() {
  return (
    <motion.section
      id="reports"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <SectionHeader
              align="left"
              eyebrow="Reports"
              title="Replace “what did we pay you for?” with a calm monthly artifact."
              text="Reports are written for clients, not engineers: what was watched, what broke, what was fixed, and what needs attention."
            />
          </div>
          <HoverPanel className="p-0">
            <div className="border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Client report preview</p>
                  <h3 className="mt-1 text-2xl font-semibold">Acme Studio · May 2026</h3>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                    Export
                  </button>
                  <button className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-zinc-950">
                    Send preview
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <ReportMetric title="Checks run" value="18,420" />
              <ReportMetric title="Issues caught" value="7" />
              <ReportMetric title="Resolved" value="6" />
            </div>
            <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_0.85fr]">
              <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <h4 className="font-semibold">Client-safe summary</h4>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  This month, your website remained available for visitors while our team detected and
                  handled several silent risks. The contact form issue was escalated quickly, SSL and
                  domain renewals remain on track, and tracking health is being monitored for campaign accuracy.
                </p>
                <div className="mt-5 grid gap-3">
                  {["Contact form test failed and was documented", "Homepage speed dipped twice during peak traffic", "GA4 and GTM remained active across core pages"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="size-4 text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <h4 className="font-semibold">Report queue</h4>
                <div className="mt-4 grid gap-3">
                  {["Northstar Dental", "BrightPath Legal", "UrbanNest Realty"].map((client, index) => (
                    <div key={client} className="flex items-center justify-between rounded-md bg-white/[0.04] p-3 text-sm">
                      <span>{client}</span>
                      <span className="text-zinc-500">{index === 0 ? "Ready" : "Draft"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </HoverPanel>
        </div>
      </div>
    </motion.section>
  );
}

function PricingSection({
  billing,
  setBilling,
  discountedPlans
}: {
  billing: "monthly" | "yearly";
  setBilling: (value: "monthly" | "yearly") => void;
  discountedPlans: Array<(typeof plans)[number] & { displayPrice: string }>;
}) {
  return (
    <motion.section
      id="pricing"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans for care-plan portfolios."
          text="Try any plan free for 7 days. Card, bank, or UPI autopay verification required to activate trial. Expired trials are suspended, and inactive data is pruned after 7 days."
        />
        <div className="mx-auto mt-8 flex w-fit rounded-md border border-white/10 bg-white/[0.04] p-1">
          {(["monthly", "yearly"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setBilling(item)}
              className={cn("relative rounded px-4 py-2 text-sm capitalize transition-colors", billing === item ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200")}
            >
              {billing === item && (
                <motion.div
                  layoutId="pricing-pill"
                  className="absolute inset-0 rounded bg-white"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item}</span>
            </button>
          ))}
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {discountedPlans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ y: -8 }}
              className={cn(
                "rounded-lg border p-5 flex flex-col justify-between",
                plan.popular ? "border-cyan-300/40 bg-cyan-300/10 shadow-glow" : "border-white/10 bg-white/[0.045]"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.popular && <StatusBadge tone="cyan">Popular</StatusBadge>}
                </div>
                <p className="mt-5 text-4xl font-semibold">{plan.displayPrice}</p>
                <p className="mt-1 text-sm text-zinc-500">/ month · {plan.sites}</p>
                <p className="mt-5 min-h-12 text-sm leading-6 text-zinc-400">{plan.description}</p>
                <Link
                  href="/sign-up"
                  className={cn("mt-6 block text-center w-full rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90", plan.popular ? "bg-cyan-300 text-zinc-950" : "bg-white text-zinc-950")}
                >
                  Start 7-day Trial
                </Link>
              </div>
              <div className="mt-8 border-t border-white/5 pt-5 grid gap-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <span key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    <span className="leading-tight">{feature}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function FAQSection() {
  const faqs = [
    ["Is this functional yet?", "No. This prototype is UI-only with static mock data so the product story and UX can be refined first."],
    ["Why a single page?", "It matches the Framer-style flow you asked for: every section is reachable from the navbar without separate routes."],
    ["What images should be generated?", "Use dark product-scene images: dashboard preview, report preview, alert inbox, and agency team workflow visuals."],
    ["Can this be moved into Framer?", "Yes. The sections, copy, and visual hierarchy are designed so they can be recreated as Framer sections or connected through Framer MCP."]
  ];
  const [open, setOpen] = useState(0);
  return (
    <motion.section
      id="faq"
      variants={sections}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      className="relative z-10 py-20"
    >
      <div className="section-shell">
        <div className="mx-auto max-w-3xl">
          <SectionHeader eyebrow="FAQ" title="Clear defaults before the build turns functional." text="A compact set of implementation notes for the next agent or Framer build." />
          <div className="mt-10 grid gap-3">
            {faqs.map(([question, answer], index) => (
              <div key={question} className="spotlight-card rounded-lg border border-white/10 bg-white/[0.045]">
                <button
                  onClick={() => setOpen(open === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <span className="font-medium">{question}</span>
                  <motion.div
                    animate={{ rotate: open === index ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <ChevronDown className="size-4" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {open === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-6 text-zinc-400">
                        {answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CTASection({ clerkEnabled }: { clerkEnabled: boolean }) {
  return (
    <section className="relative z-10 pb-20 pt-8">
      <div className="section-shell">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(16,185,129,0.12)_45%,rgba(255,255,255,0.05))] p-8 text-center shadow-glow sm:p-12">
          <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Ready for the Framer pass</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-normal sm:text-5xl">
            Turn website maintenance into visible monthly value.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-300">
            Use this one-page prototype as the base for Framer, Codex, or v0, then wire the real monitoring engine after the design lands.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CTAButtons clerkEnabled={clerkEnabled} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopHeaderActions({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return (
      <div className="hidden items-center gap-3 md:flex">
        <Link href="/sign-in" className="text-sm text-zinc-300 transition hover:text-white">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 md:flex">
      <Show when="signed-in" fallback={<SignedOutHeaderActions />}>
        <SignedInHeaderActions />
      </Show>
    </div>
  );
}

function MobileHeaderActions({
  clerkEnabled,
  onNavigate
}: {
  clerkEnabled: boolean;
  onNavigate: () => void;
}) {
  if (!clerkEnabled) {
    return (
      <>
        <Link
          href="/sign-in"
          className="rounded-md px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white"
          onClick={onNavigate}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-cyan-300 px-3 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
          onClick={onNavigate}
        >
          Create account
        </Link>
      </>
    );
  }

  return (
    <Show when="signed-in" fallback={<SignedOutMobileActions onNavigate={onNavigate} />}>
      <SignedInMobileActions onNavigate={onNavigate} />
    </Show>
  );
}

function SignedOutHeaderActions() {
  return (
    <>
      <Link href="/sign-in" className="text-sm text-zinc-300 transition hover:text-white">
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
      >
        Create account
      </Link>
    </>
  );
}

function SignedInHeaderActions() {
  const { orgId } = useAuth();
  const primaryHref = orgId ? "/dashboard" : "/onboarding";
  const primaryLabel = orgId ? "Open dashboard" : "Set up agency";

  return (
    <>
      <Link href={primaryHref} prefetch={false} className="text-sm text-zinc-300 transition hover:text-white">
        {primaryLabel}
      </Link>
      <OrganizationSwitcher
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
        createOrganizationMode="modal"
        organizationProfileMode="modal"
        appearance={{
          elements: {
            organizationSwitcherTrigger: "!text-white",
            organizationSwitcherTriggerIcon: "!text-white"
          }
        }}
      />
      <UserButton
        showName
        appearance={{
          elements: {
            userButtonOuterIdentifier: "!text-white",
            userButtonTrigger: "!text-white"
          }
        }}
      />
    </>
  );
}

function SignedOutMobileActions({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <Link
        href="/sign-in"
        className="rounded-md px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white"
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-md bg-cyan-300 px-3 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
        onClick={onNavigate}
      >
        Create account
      </Link>
    </>
  );
}

function SignedInMobileActions({ onNavigate }: { onNavigate: () => void }) {
  const { orgId } = useAuth();
  const primaryHref = orgId ? "/dashboard" : "/onboarding";
  const primaryLabel = orgId ? "Open dashboard" : "Set up agency";

  return (
    <Link
      href={primaryHref}
      prefetch={false}
      className="rounded-md bg-cyan-300 px-3 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
      onClick={onNavigate}
    >
      {primaryLabel}
    </Link>
  );
}

function HeroActions({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return (
      <>
        <Link
          href="/sign-up"
          className="group flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:w-auto"
        >
          Create your agency account
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#reports"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
        >
          <Play className="size-4" />
          View report flow
        </a>
      </>
    );
  }

  return (
    <Show when="signed-in" fallback={<SignedOutHeroActions />}>
      <SignedInHeroActions />
    </Show>
  );
}

function SignedOutHeroActions() {
  return (
    <>
      <Link
        href="/sign-up"
        className="group flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:w-auto"
      >
        Create your agency account
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </Link>
      <a
        href="#reports"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
      >
        <Play className="size-4" />
        View report flow
      </a>
    </>
  );
}

function SignedInHeroActions() {
  const { orgId } = useAuth();
  const href = orgId ? "/dashboard" : "/onboarding";
  const label = orgId ? "Open your dashboard" : "Create your agency workspace";

  return (
    <>
      <Link
        href={href}
        prefetch={false}
        className="group flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:w-auto"
      >
        {label}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </Link>
      <a
        href="#reports"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
      >
        <Play className="size-4" />
        View report flow
      </a>
    </>
  );
}

function CTAButtons({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return (
      <>
        <Link href="/sign-up" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950">
          Start with Clerk auth
        </Link>
        <a href="#product" className="rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white">
          See product story
        </a>
      </>
    );
  }

  return (
    <Show when="signed-in" fallback={<SignedOutCTAButtons />}>
      <SignedInCTAButtons />
    </Show>
  );
}

function SignedOutCTAButtons() {
  return (
    <>
      <Link href="/sign-up" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950">
        Start with Clerk auth
      </Link>
      <a href="#product" className="rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white">
        See product story
      </a>
    </>
  );
}

function SignedInCTAButtons() {
  const { orgId } = useAuth();
  const href = orgId ? "/dashboard" : "/onboarding";
  const label = orgId ? "Go to dashboard" : "Finish agency setup";

  return (
    <>
      <Link
        href={href}
        prefetch={false}
        className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950"
      >
        {label}
      </Link>
      <a href="#product" className="rounded-md border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white">
        See product story
      </a>
    </>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 py-8">
      <div className="section-shell flex flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Maintly · UI-only prototype</p>
        <p>Inspired by Framer-style single-page SaaS launches and shadcn dashboard patterns.</p>
      </div>
    </footer>
  );
}

function ProductMockup() {
  return (
    <div className="border-beam relative rounded-lg border border-white/10 bg-[#0a0f19] p-2 shadow-2xl shadow-cyan-950/30">
      <div className="rounded-md border border-white/10 bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-400" />
            <span className="size-3 rounded-full bg-amber-300" />
            <span className="size-3 rounded-full bg-emerald-300" />
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-zinc-400 sm:block">
            maintly.app/dashboard
          </div>
          <ShieldCheck className="size-4 text-cyan-300" />
        </div>
        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          <div className="hidden border-r border-white/10 p-4 lg:block">
            <div className="mb-5 h-10 rounded-md bg-white/8" />
            <div className="grid gap-2">
              {["Overview", "Sites", "Alerts", "Reports", "Branding"].map((item, index) => (
                <div key={item} className={cn("h-9 rounded-md px-3 py-2 text-sm", index === 0 ? "bg-cyan-300/10 text-cyan-100" : "bg-white/[0.03] text-zinc-500")}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <stat.icon className="size-4 text-cyan-300" />
                  <p className="mt-5 text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Portfolio uptime</p>
                  <StatusBadge tone="emerald">Live</StatusBadge>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Bar dataKey="checks" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-medium">Incident stream</p>
                <div className="mt-4 grid gap-3">
                  {incidents.slice(0, 3).map((item) => (
                    <div key={item.issue} className="rounded-md bg-zinc-950/60 p-3">
                      <p className="text-xs text-zinc-400">{item.site}</p>
                      <p className="mt-1 text-sm">{item.issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
  align = "center"
}: {
  eyebrow: string;
  title: string;
  text: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-normal text-white sm:text-5xl">{title}</h2>
      <p className="mt-4 text-pretty leading-7 text-zinc-400">{text}</p>
    </div>
  );
}

function HoverPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    currentTarget.style.setProperty("--mouse-x", `${clientX - left}px`);
    currentTarget.style.setProperty("--mouse-y", `${clientY - top}px`);
  }, []);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      onMouseMove={handleMouseMove}
      className={cn("spotlight-card glass-panel rounded-lg", className)}
    >
      {children}
    </motion.div>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "emerald" && "bg-emerald-300/10 text-emerald-200",
        tone === "red" && "bg-rose-300/10 text-rose-200",
        tone === "amber" && "bg-amber-300/10 text-amber-200",
        tone === "cyan" && "bg-cyan-300/10 text-cyan-200"
      )}
    >
      {children}
    </span>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.04] p-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-200">{value}</p>
    </div>
  );
}

function ReportMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ChartNoAxesColumn,
  CheckCircle2,
  Clock3,
  Globe,
  ShieldCheck
} from "lucide-react";
import { redirect } from "next/navigation";
import { ClerkSetupCard } from "@/components/clerk-setup-card";
import { isClerkConfigured } from "@/lib/clerk";

const dashboardStats = [
  { label: "Sites monitored", value: "148", icon: Globe, note: "+12 this week" },
  { label: "Checks passing", value: "97.3%", icon: ShieldCheck, note: "SSL, forms, tracking" },
  { label: "Open alerts", value: "6", icon: AlertTriangle, note: "2 critical" },
  { label: "Reports due", value: "14", icon: ChartNoAxesColumn, note: "Monthly proof of work" }
];

const incidentFeed = [
  { title: "Checkout form failed on mobile", site: "Northstar Dental", age: "8 minutes ago", tone: "text-rose-300" },
  { title: "SSL certificate expires in 11 days", site: "BrightPath Legal", age: "1 hour ago", tone: "text-amber-300" },
  { title: "Meta Pixel missing on landing page", site: "UrbanNest Realty", age: "3 hours ago", tone: "text-cyan-300" }
];

const workQueue = [
  { title: "May executive summary", detail: "12 client reports need approval", icon: ChartNoAxesColumn },
  { title: "Alert routing cleanup", detail: "2 domains still notify the wrong owner", icon: Bell },
  { title: "Weekly health review", detail: "Next run scheduled in 43 minutes", icon: Clock3 }
];

export default async function DashboardPage() {
  if (!isClerkConfigured) {
    return (
      <main className="min-h-screen bg-[#070b12] px-4 py-12 text-zinc-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <ClerkSetupCard title="Add Clerk keys before using the dashboard" />
        </div>
      </main>
    );
  }

  const { orgId, redirectToSignIn, userId } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  if (!orgId) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-zinc-50">
      <div className="border-b border-white/10 bg-[#070b12]/90 backdrop-blur-xl">
        <div className="section-shell flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Agency dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Operational view</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>
      </div>

      <section className="section-shell py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className="glass-panel rounded-lg p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{stat.label}</p>
                <stat.icon className="size-4 text-cyan-300" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-zinc-400">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Incident feed</p>
                <h2 className="mt-2 text-xl font-semibold text-white">What needs action now</h2>
              </div>
              <Link
                href="/onboarding"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Manage workspace
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4">
              {incidentFeed.map((incident) => (
                <div key={incident.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-medium text-white">{incident.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{incident.site}</p>
                    </div>
                    <span className={`text-sm font-medium ${incident.tone}`}>{incident.age}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel rounded-lg p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Agency state</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Workspace is protected</h2>
              <ul className="mt-5 grid gap-3 text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Authenticated routing is enforced by Clerk middleware.
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Agency creation is mapped to Clerk organizations.
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Signed-in users without an active organization are redirected to onboarding.
                </li>
              </ul>
            </div>

            <div className="glass-panel rounded-lg p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Work queue</p>
              <div className="mt-5 grid gap-4">
                {workQueue.map((item) => (
                  <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <item.icon className="mt-0.5 size-4 text-cyan-300" />
                      <div>
                        <h3 className="text-sm font-medium text-white">{item.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  ChartNoAxesColumn,
  Clock3,
  Globe,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { eq, and, inArray, isNull, sql, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { sites, checkResults, incidents, reports } from '@/lib/db/schema';
import { AddSiteDialog } from '@/components/add-site-dialog';
import { ClerkSetupCard } from '@/components/clerk-setup-card';
import { isClerkConfigured } from '@/lib/clerk';
import { NotificationBell } from '@/components/notification-bell';

// Inline CN utility
function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * StatusBadge Component.
 * Renders a color-coded status badge indicating health check states (emerald = passing, red = critical, amber = warning, cyan = watch/info).
 */
function StatusBadge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tone === 'emerald' && 'bg-emerald-300/10 text-emerald-200',
        tone === 'red' && 'bg-rose-300/10 text-rose-200',
        tone === 'amber' && 'bg-amber-300/10 text-amber-200',
        tone === 'cyan' && 'bg-cyan-300/10 text-cyan-200'
      )}
    >
      {children}
    </span>
  );
}

/**
 * DashboardPage Server Component.
 * Coordinates authenticated agency workspace status views:
 * - Checks if Clerk keys are configured.
 * - Redirects unauthorized or un-onboarded requests.
 * - Fetches sites under the current Clerk organization/user workspace.
 * - Queries active incidents (unresolved warnings/errors).
 * - Dynamically computes checking success percentages from historical results.
 * - Displays client reports status overview and active operational charts.
 */
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
    redirect('/onboarding');
  }

  // Fetch or initialize organization details
  const org = await getOrCreateOrg(orgId);

  // Fetch all sites with checks for the organization
  const orgSites = await db.query.sites.findMany({
    where: eq(sites.orgId, org.id),
    with: {
      checks: true,
    },
    orderBy: [desc(sites.createdAt)],
  });

  const siteIds = orgSites.map((s) => s.id);

  // Fetch open alerts (incidents)
  const activeIncidents =
    siteIds.length > 0
      ? await db.query.incidents.findMany({
          where: and(isNull(incidents.resolvedAt), inArray(incidents.siteId, siteIds)),
          with: {
            site: true,
          },
          orderBy: [desc(incidents.createdAt)],
        })
      : [];

  // Calculate dynamic check passing percentage
  const checkIds = orgSites.flatMap((s) => s.checks.map((c) => c.id));
  let checksPassingPercentage = '100.0%';
  if (checkIds.length > 0) {
    const results = await db.query.checkResults.findMany({
      where: inArray(checkResults.checkId, checkIds),
      orderBy: [desc(checkResults.createdAt)],
    });

    const latestResults = new Map<string, string>();
    for (const res of results) {
      if (!latestResults.has(res.checkId)) {
        latestResults.set(res.checkId, res.status);
      }
    }

    const totalChecked = latestResults.size;
    if (totalChecked > 0) {
      const passingCount = Array.from(latestResults.values()).filter(
        (status) => status === 'passing'
      ).length;
      checksPassingPercentage = `${((passingCount / totalChecked) * 100).toFixed(1)}%`;
    }
  }

  // Calculate per-site real uptime % from last 30 days of uptime check results
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const siteUptimeMap = new Map<string, string>();
  for (const site of orgSites) {
    const uptimeCheck = site.checks.find((c) => c.type === 'uptime');
    if (!uptimeCheck) {
      siteUptimeMap.set(site.id, 'N/A');
      continue;
    }
    const uptimeResults = await db.query.checkResults.findMany({
      where: and(
        eq(checkResults.checkId, uptimeCheck.id),
        sql`${checkResults.createdAt} >= ${thirtyDaysAgo}`
      ),
    });
    if (uptimeResults.length === 0) {
      siteUptimeMap.set(site.id, '—');
    } else {
      const passing = uptimeResults.filter((r) => r.status === 'passing').length;
      siteUptimeMap.set(site.id, `${((passing / uptimeResults.length) * 100).toFixed(2)}%`);
    }
  }

  // Calculate reports due (draft status for current month)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const reportsDueCount =
    siteIds.length > 0
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(reports)
          .where(
            and(
              inArray(reports.siteId, siteIds),
              eq(reports.month, currentMonth),
              eq(reports.year, currentYear),
              eq(reports.status, 'draft')
            )
          )
          .then((res) => res[0]?.count || 0)
      : 0;

  // Define dashboard stats grid
  const stats = [
    {
      label: 'Sites monitored',
      value: String(orgSites.length),
      icon: Globe,
      note: `Limit: ${org.maxSites} sites (${org.plan} plan)`,
    },
    {
      label: 'Checks passing',
      value: checksPassingPercentage,
      icon: ShieldCheck,
      note: 'SSL, domain, uptime checks',
    },
    {
      label: 'Open alerts',
      value: String(activeIncidents.length),
      icon: AlertTriangle,
      note: activeIncidents.length > 0 ? `${activeIncidents.length} active incidents` : 'All checks clear',
    },
    {
      label: 'Reports due',
      value: String(reportsDueCount),
      icon: ChartNoAxesColumn,
      note: `Month: ${new Date().toLocaleString('default', { month: 'long' })}`,
    },
  ];

  // Incidents mapped for display
  const incidentFeed = activeIncidents.map((inc) => {
    const timeDiffMs = new Date().getTime() - new Date(inc.createdAt).getTime();
    const timeDiffMins = Math.max(1, Math.floor(timeDiffMs / 60000));
    const ageText = timeDiffMins < 60 ? `${timeDiffMins}m ago` : `${Math.floor(timeDiffMins / 60)}h ago`;

    return {
      title: inc.issue,
      site: inc.site?.name || 'Unknown Website',
      age: ageText,
      tone: inc.severity === 'critical' ? 'text-rose-300' : 'text-amber-300',
    };
  });

  // Mock workspace tasks to keep sidebar preview rich
  const workQueue = [
    {
      title: 'Monthly Executive Summaries',
      detail: reportsDueCount > 0 ? `${reportsDueCount} client reports need review` : 'All client reports approved',
      icon: ChartNoAxesColumn,
    },
    {
      title: 'Alert settings configured',
      detail: 'Slack and email integrations are active',
      icon: Bell,
    },
    {
      title: 'Scheduler Engine status',
      detail: 'Uptime checks running every 5 minutes',
      icon: Clock3,
    },
  ];

  return (
    <main className="min-h-screen bg-[#070b12] text-zinc-50">
      {/* Header */}
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
                  organizationSwitcherTrigger: '!text-white',
                  organizationSwitcherTriggerIcon: '!text-white',
                },
              }}
            />
            <NotificationBell />
            <UserButton
              showName
              appearance={{
                elements: {
                  userButtonOuterIdentifier: '!text-white',
                  userButtonTrigger: '!text-white',
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-b border-white/5 bg-[#070b12]/50">
        <div className="section-shell flex gap-6">
          <a href="/dashboard" className="border-b-2 border-cyan-400 py-3 text-sm font-medium text-white">Portfolio</a>
          <a href="/dashboard/reports" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Reports</a>
          <a href="/dashboard/settings/branding" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Branding</a>
        </div>
      </div>

      <section className="section-shell py-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel rounded-lg p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{stat.label}</p>
                <stat.icon className="size-4 text-cyan-300" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-zinc-500">{stat.note}</p>
            </div>
          ))}
        </div>

        {/* Dynamic Sites and Incidents Sections */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          {/* Sites Portfolio Table */}
          <div className="glass-panel rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Sites Portfolio</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Monitored Websites</h2>
              </div>
              <AddSiteDialog maxSites={org.maxSites} activeSitesCount={orgSites.length} />
            </div>

            {orgSites.length === 0 ? (
              <div className="mt-12 text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/[0.01]">
                <Globe className="mx-auto size-12 text-zinc-600" />
                <h3 className="mt-4 text-lg font-medium text-white">No sites added yet</h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">
                  Add your first website to enable automatic uptime, SSL expiration, and domain checking.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-xs uppercase text-zinc-500 border-b border-white/10">
                    <tr>
                      <th className="pb-3 font-medium">Website</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Uptime</th>
                      <th className="pb-3 font-medium">Checks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orgSites.map((site) => {
                      const siteIncident = activeIncidents.find((inc) => inc.siteId === site.id);
                      
                      const statusText = siteIncident ? siteIncident.issue : 'Healthy';
                      const tone = siteIncident 
                        ? (siteIncident.severity === 'critical' ? 'red' : 'amber') 
                        : 'emerald';

                      return (
                        <tr key={site.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 pr-4">
                            <p className="font-medium text-white">{site.name}</p>
                            <a 
                              href={site.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-zinc-500 hover:text-cyan-300 flex items-center gap-1 w-fit mt-0.5"
                            >
                              {site.url.replace(/^https?:\/\//i, '')}
                              <ExternalLink className="size-3" />
                            </a>
                          </td>
                          <td className="py-4">
                            <StatusBadge tone={tone}>{statusText}</StatusBadge>
                          </td>
                          <td className="py-4 text-zinc-300">
                            {siteUptimeMap.get(site.id) ?? '—'}
                          </td>
                          <td className="py-4 text-xs text-zinc-400">
                            <div className="flex gap-2">
                              {site.checks.map((c) => (
                                <span 
                                  key={c.id} 
                                  className="rounded px-1.5 py-0.5 bg-white/5 border border-white/5 uppercase font-mono"
                                >
                                  {c.type}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Incident Feed */}
          <div className="grid gap-6">
            <div className="glass-panel rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Incident feed</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Needs Action</h2>
                </div>
                <AlertTriangle className="size-5 text-rose-300" />
              </div>

              {incidentFeed.length === 0 ? (
                <div className="mt-8 text-center py-8 rounded-lg bg-emerald-400/5 border border-emerald-400/10 text-emerald-300 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="size-7 text-emerald-300" />
                  <p className="text-sm font-medium">All websites healthy</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {incidentFeed.map((incident) => (
                    <div key={incident.title} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-white">{incident.title}</h3>
                          <p className="mt-1 text-xs text-zinc-400">{incident.site}</p>
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded bg-white/5', incident.tone)}>
                          {incident.age}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Work Queue */}
            <div className="glass-panel rounded-lg p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Workspace status</p>
              <div className="mt-5 grid gap-4">
                {workQueue.map((item) => (
                  <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <item.icon className="mt-0.5 size-4 text-cyan-300 shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-white">{item.title}</h3>
                        <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
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

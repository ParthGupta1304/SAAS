import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { eq, sql } from 'drizzle-orm';
import { sites } from '@/lib/db/schema';
import { Check, Shield, Zap, Building2, Globe, AlertCircle, ArrowUpRight } from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { NotificationBell } from '@/components/notification-bell';

export default async function BillingPage() {
  const { orgId, redirectToSignIn, userId } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  if (!orgId) {
    redirect('/onboarding');
  }

  // Retrieve organization details
  const org = await getOrCreateOrg(orgId);

  // Fetch count of sites under organization
  const [siteCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sites)
    .where(eq(sites.orgId, org.id));
  
  const siteCount = siteCountRes?.count || 0;

  // Determine subscription status
  const isTrial = org.plan === 'trial';
  const trialEnds = new Date(org.trialEndsAt);
  const isTrialExpired = isTrial && trialEnds.getTime() < Date.now();
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Define checkout URLs matching the Lemon Squeezy variants
  const getCheckoutLink = (planName: string) => {
    let baseUrl = '';
    switch (planName) {
      case 'starter':
        baseUrl = process.env.NEXT_PUBLIC_LS_STARTER_URL || 'https://maintly.lemonsqueezy.com/buy/d3455982-f04b-4b11-a8e5-efd727b29a28';
        break;
      case 'growth':
        baseUrl = process.env.NEXT_PUBLIC_LS_GROWTH_URL || 'https://maintly.lemonsqueezy.com/buy/e93fbb17-8149-4171-badb-8877e8ee81f9';
        break;
      case 'agency':
        baseUrl = process.env.NEXT_PUBLIC_LS_AGENCY_URL || 'https://maintly.lemonsqueezy.com/buy/b0e515d9-43c2-4848-8df0-1cc67d4f9bfd';
        break;
      case 'scale':
        baseUrl = process.env.NEXT_PUBLIC_LS_SCALE_URL || 'https://maintly.lemonsqueezy.com/buy/dce3f8a4-ea66-417a-8f77-dece6a310657';
        break;
      default:
        baseUrl = 'https://maintly.lemonsqueezy.com/buy/d3455982-f04b-4b11-a8e5-efd727b29a28';
    }

    return `${baseUrl}?checkout[custom][orgId]=${org.id}&checkout[custom][plan]=${planName}`;
  };

  const tiers = [
    {
      name: 'Starter',
      key: 'starter',
      price: '$19',
      interval: 'mo',
      icon: Shield,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
      tagline: 'Perfect for small agencies and freelancers.',
      features: [
        'Monitor up to 10 client websites',
        'Uptime checks at 5-minute intervals',
        'SSL certificate expiration tracking',
        'Slack alert integrations',
        'Standard PDF client reports',
        'Basic AI Summaries'
      ],
    },
    {
      name: 'Growth',
      key: 'growth',
      price: '$49',
      interval: 'mo',
      icon: Zap,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
      tagline: 'For agencies requiring deeper diagnostics.',
      features: [
        'Monitor up to 50 client websites',
        'Uptime checks at 1-minute intervals',
        'SSL certificate expiration tracking',
        'Slack alert integrations',
        'Interactive client-friendly reports',
        'AI Form Auditor testing (on 5 sites)',
        'Detailed AI Summaries'
      ],
    },
    {
      name: 'Agency',
      key: 'agency',
      price: '$99',
      interval: 'mo',
      icon: Building2,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
      tagline: 'Best for agencies offering white-label services.',
      features: [
        'Monitor up to 150 client websites',
        'Uptime checks at 1-minute intervals',
        'SSL certificate expiration tracking',
        'Slack alert integrations',
        'AI Form Auditor testing (on all sites)',
        'Complete White-label PDF branding',
        'Remove all Maintly signatures',
        'Priority support & reports customization'
      ],
      popular: true,
    },
    {
      name: 'Scale',
      key: 'scale',
      price: '$250',
      interval: 'mo',
      icon: Globe,
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30',
      tagline: 'High volume capacity for large scale firms.',
      features: [
        'Monitor up to 400 client websites',
        'Uptime checks at 1-minute intervals',
        'SSL certificate expiration tracking',
        'Slack alert integrations',
        'AI Form Auditor testing (on all sites)',
        'Complete White-label PDF branding',
        'Dedicated server/engine support'
      ],
    },
  ];

  const currentPlanName = org.plan.toUpperCase();

  return (
    <main className="min-h-screen bg-[#070b12] text-zinc-50">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#070b12]/90 backdrop-blur-xl">
        <div className="section-shell flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Agency settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Billing & Subscription</h1>
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
          <a href="/dashboard" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Portfolio</a>
          <a href="/dashboard/reports" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Reports</a>
          <a href="/dashboard/settings/branding" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Branding</a>
          <a href="/dashboard/billing" className="border-b-2 border-cyan-400 py-3 text-sm font-medium text-white">Billing</a>
        </div>
      </div>

      <section className="section-shell py-12">
        {/* Status Dashboard Banner */}
        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="glass-panel rounded-lg p-6 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-300 font-semibold">Active Plan</p>
              <div className="flex items-center gap-3 mt-2">
                <h2 className="text-3xl font-bold text-white">{currentPlanName}</h2>
                {isTrial && (
                  <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2.5 py-0.5 rounded-full font-medium">
                    {isTrialExpired ? 'Trial Expired' : `${trialDaysLeft} Days Left in Trial`}
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mt-2 max-w-lg">
                Your workspace is on the {org.plan} tier. Active subscriptions handle automatic background monitoring checks, report mailouts, and AI audits.
              </p>
            </div>

            {/* Site Limit Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-400">Site Limits Usage</span>
                <span className="text-white font-semibold">
                  {siteCount} of {org.maxSites} Sites Monitored
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (siteCount / org.maxSites) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Uptime tracking operates at {org.plan === 'starter' || org.plan === 'trial' ? '5-min' : '1-min'} check intervals.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-lg p-6 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Lemon Squeezy Billing</h3>
              <p className="text-zinc-400 text-xs mt-1">
                Manage your payment information, invoices, billing email, or cancel subscription auto-renewals securely.
              </p>
            </div>
            
            <div className="space-y-4">
              <a
                href="https://my.lemonsqueezy.com/billing"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors w-full"
              >
                Open Customer Portal
                <ArrowUpRight className="size-3.5" />
              </a>

              {isTrialExpired && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md flex gap-2.5 items-start">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Payment Required:</strong> Your 7-day free trial has expired. Background monitoring checks are currently suspended. Select a plan below to activate autopay.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="mt-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white">Compare Plans & Upgrade</h2>
            <p className="text-zinc-400 text-sm mt-2">
              Upgrade to higher tiers to unlock higher site limits, 1-minute check intervals, White-label PDF branding, and the play-by-play AI Form Auditor.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => {
              const isCurrent = org.plan === tier.key;
              const Icon = tier.icon;
              const isPopular = tier.popular;

              return (
                <div
                  key={tier.name}
                  className={`glass-panel rounded-lg p-6 flex flex-col justify-between border relative overflow-hidden ${
                    isPopular ? 'border-emerald-500/50 bg-emerald-500/[0.02]' : 'border-white/10 bg-white/[0.01]'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-[#080c14] text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <Icon className="size-5 text-cyan-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{tier.name}</h3>
                        <p className="text-xs text-zinc-500">Tier Capacity</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                      <span className="text-zinc-500 text-xs">/{tier.interval}</span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{tier.tagline}</p>

                    <ul className="space-y-3 pt-6 border-t border-white/5">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                          <Check className="size-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full text-center rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 px-4 py-2 text-xs font-semibold cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <a
                        href={getCheckoutLink(tier.key)}
                        className={`w-full text-center block rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                          isPopular
                            ? 'bg-emerald-500 text-[#080c14] hover:bg-emerald-400'
                            : 'bg-cyan-400 text-[#080c14] hover:bg-cyan-300'
                        }`}
                      >
                        {org.plan === 'trial' ? `Start Trial of ${tier.name}` : `Upgrade to ${tier.name}`}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

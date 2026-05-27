import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { isClerkConfigured } from '@/lib/clerk';
import { ClerkSetupCard } from '@/components/clerk-setup-card';
import { NotificationBell } from '@/components/notification-bell';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { BrandingForm } from '@/components/branding-form';

export default async function BrandingSettingsPage() {
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

  // Fetch organization details
  const org = await getOrCreateOrg(orgId);

  return (
    <main className="min-h-screen bg-[#070b12] text-zinc-50">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#070b12]/90 backdrop-blur-xl">
        <div className="section-shell flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Agency settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Agency Branding</h1>
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

      {/* Navigation tabs */}
      <div className="border-b border-white/5 bg-[#070b12]/50">
        <div className="section-shell flex gap-6">
          <a href="/dashboard" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Portfolio</a>
          <a href="/dashboard/reports" className="border-b-2 border-transparent py-3 text-sm font-medium text-zinc-400 hover:text-white">Reports</a>
          <a href="/dashboard/settings/branding" className="border-b-2 border-cyan-400 py-3 text-sm font-medium text-white">Branding</a>
        </div>
      </div>

      <section className="section-shell py-8">
        <div className="max-w-2xl">
          <BrandingForm initialOrg={org} />
        </div>
      </section>
    </main>
  );
}

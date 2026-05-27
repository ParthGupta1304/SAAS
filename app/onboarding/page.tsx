import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ClerkSetupCard } from "@/components/clerk-setup-card";
import { isClerkConfigured } from "@/lib/clerk";

export default async function OnboardingPage() {
  if (!isClerkConfigured) {
    return (
      <AuthShell
        eyebrow="Onboarding"
        title="Finish the Clerk setup first."
        description="The onboarding flow is ready, but organization creation depends on valid Clerk credentials."
      >
        <ClerkSetupCard />
      </AuthShell>
    );
  }

  const { orgId, redirectToSignIn, userId } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  if (orgId) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="Agency onboarding"
      title="Choose or create the agency workspace."
      description="Your agency workspace is a Clerk organization. Create a new one, or select an existing organization you already belong to (for example, if you were invited)."
    >
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
      />
    </AuthShell>
  );
}

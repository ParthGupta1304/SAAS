import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { ClerkSetupCard } from "@/components/clerk-setup-card";
import { isClerkFrontendReady } from "@/lib/clerk";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Registration"
      title="Create the agency account first."
      description="Each agency owner signs up as a user, then creates the agency workspace as a Clerk organization during onboarding."
    >
      {isClerkFrontendReady ? (
        <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" />
      ) : (
        <ClerkSetupCard />
      )}
    </AuthShell>
  );
}

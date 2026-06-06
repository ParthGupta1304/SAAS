import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { ClerkSetupCard } from "@/components/clerk-setup-card";
import { isClerkFrontendReady } from "@/lib/clerk";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Authentication"
      title="Sign in to your workspace."
      description="Use Clerk to handle account security, session state, and the handoff into your dashboard."
    >
      {isClerkFrontendReady ? (
        <SignIn
          path="/sign-in"
          routing="path"
          fallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
          signUpUrl="/sign-up"
        />
      ) : (
        <ClerkSetupCard />
      )}
    </AuthShell>
  );
}

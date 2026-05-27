type ClerkSetupCardProps = {
  title?: string;
  description?: string;
};

export function ClerkSetupCard({
  title = "Add Clerk credentials to enable authentication",
  description = "This project is wired for Clerk, but it still needs your instance keys before sign-in, sign-up, and protected routes can run."
}: ClerkSetupCardProps) {
  return (
    <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-6 text-left">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">{description}</p>
      <div className="mt-5 rounded-md border border-white/10 bg-[#0b1220] p-4">
        <p className="font-mono text-xs leading-7 text-cyan-100">
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
          <br />
          CLERK_SECRET_KEY=...
          <br />
          NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
          <br />
          NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
          <br />
          NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
          <br />
          NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
        </p>
      </div>
    </div>
  );
}

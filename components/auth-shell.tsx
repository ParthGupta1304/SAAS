import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b12] text-zinc-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(circle_at_50%_10%,rgba(34,211,238,0.22),transparent_48%),radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 soft-grid opacity-60" />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 top-28 size-[420px] rounded-full bg-cyan-500/10 blur-3xl shadow-glow" />
        <div className="absolute -right-32 bottom-20 size-[460px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <header className="relative z-10 border-b border-white/10 bg-[#070b12]/80 backdrop-blur-xl">
        <div className="section-shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-sm font-semibold tracking-normal">
              Agency Site Guard
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-300 transition hover:text-white"
          >
            Back to site
          </Link>
        </div>
      </header>
      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center py-12">
        <div className="section-shell grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-300">
              {description}
            </p>
            <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                Invite your agency team into a shared workspace with one active
                organization.
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                Keep sign-in, session handling, and organization switching in
                Clerk instead of custom auth code.
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-lg p-3 sm:p-5 lg:translate-x-4">
            <div className="flex justify-center">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}

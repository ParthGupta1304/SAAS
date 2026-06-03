'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Globe, Bell, CreditCard, ChevronRight, Loader2, AlertCircle, Check } from 'lucide-react';

interface OrgDetails {
  id: string;
  name: string;
}

export function OnboardingWizard({ org }: { org: OrgDetails }) {
  const { user } = useUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [clientName, setClientName] = useState('');
  
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');

  // Step 1: Add site submission
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !siteUrl) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Submit site details to backend API
      const siteRes = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          url: siteUrl,
          clientName: clientName || null,
        }),
      });

      const siteData = await siteRes.json();
      if (!siteRes.ok) {
        throw new Error(siteData.error || 'Failed to register website');
      }

      // 2. Setup alerts
      if (emailAlerts || slackWebhookUrl) {
        await fetch('/api/settings/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channels: [
              ...(emailAlerts ? [{ type: 'email', config: { email: userEmail } }] : []),
              ...(slackWebhookUrl ? [{ type: 'slack', config: { webhookUrl: slackWebhookUrl } }] : []),
            ],
          }),
        }).catch((err) => console.error('Silent alerts setup error:', err));
      }

      // Move to billing step
      setStep(3);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error occurred while saving site details.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutRedirect = () => {
    const baseCheckoutUrl =
      process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL ||
      'https://maintly.lemonsqueezy.com/buy/d3455982-f04b-4b11-a8e5-efd727b29a28'; // fallback sandbox
    
    // Construct prefilled and custom data checkout link
    const checkoutLink = `${baseCheckoutUrl}?checkout[custom][orgId]=${org.id}&checkout[custom][plan]=starter&checkout[email]=${encodeURIComponent(userEmail)}`;
    
    // Redirect user to Lemon Squeezy Trial Autopay Setup
    window.location.href = checkoutLink;
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      {/* Wizard Steps Progress Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              step >= 1 ? 'bg-cyan-400 text-[#080c14]' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            1
          </span>
          <span className={`text-sm font-medium ${step === 1 ? 'text-white' : 'text-zinc-400'}`}>Add Site</span>
        </div>
        <ChevronRight className="size-4 text-zinc-600" />
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              step >= 2 ? 'bg-cyan-400 text-[#080c14]' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            2
          </span>
          <span className={`text-sm font-medium ${step === 2 ? 'text-white' : 'text-zinc-400'}`}>Alert Channels</span>
        </div>
        <ChevronRight className="size-4 text-zinc-600" />
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              step >= 3 ? 'bg-cyan-400 text-[#080c14]' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            3
          </span>
          <span className={`text-sm font-medium ${step === 3 ? 'text-white' : 'text-zinc-400'}`}>Activate Trial</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Step 1 Form: Add Website */}
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="glass-panel rounded-lg p-6 space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200 flex items-center gap-1.5">
              <Globe className="size-4" /> Step 1 of 3
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Add Your First Website</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter the site domain details to configure automatic uptime and expiration checking.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Website Name</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Client Landing Page"
                className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Website URL / Domain</label>
              <input
                type="text"
                required
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="e.g. clientwebsite.com"
                className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Client/Owner Name (Optional)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp Inc."
                className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={!siteName || !siteUrl}
              className="flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              Continue
              <ChevronRight className="size-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2 Form: Configure Alert Channels */}
      {step === 2 && (
        <form onSubmit={handleAddSite} className="glass-panel rounded-lg p-6 space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200 flex items-center gap-1.5">
              <Bell className="size-4" /> Step 2 of 3
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Setup Alerts Routing</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Decide how Maintly should contact your team when a client website encounters an issue.
            </p>
          </div>

          <div className="space-y-5">
            {/* Email alerts checkbox */}
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.01] p-4 cursor-pointer hover:bg-white/[0.02]">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="size-4 rounded border-zinc-700 bg-[#070b12] text-cyan-400 focus:ring-cyan-400 focus:ring-offset-[#080c14] mt-1 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-white">Email Alerts</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Send critical downtime alerts to your admin profile email address ({userEmail}).
                </p>
              </div>
            </label>

            {/* Slack Integration input */}
            <div className="rounded-lg border border-white/10 bg-white/[0.01] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!!slackWebhookUrl}
                  onChange={(e) => {
                    if (!e.target.checked) setSlackWebhookUrl('');
                    else setSlackWebhookUrl('https://hooks.slack.com/services/...');
                  }}
                  className="size-4 rounded border-zinc-700 bg-[#070b12] text-cyan-400 focus:ring-cyan-400 focus:ring-offset-[#080c14] mt-1 shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Slack Webhook Alerts</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Post beautiful, color-coded status update cards to your Slack team channel.
                  </p>
                </div>
              </div>

              {!!slackWebhookUrl && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    required
                    value={slackWebhookUrl === 'https://hooks.slack.com/services/...' ? '' : slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00/B00/X00"
                    className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-2 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin text-[#080c14]" />
                  Provisioning...
                </>
              ) : (
                <>
                  Provision Checks
                  <ChevronRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 3 Form: Activate Free Trial (Redirection) */}
      {step === 3 && (
        <div className="glass-panel rounded-lg p-6 space-y-6 text-center">
          <div className="flex flex-col items-center">
            <div className="size-12 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-4">
              <CreditCard className="size-6 text-cyan-300" />
            </div>
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">Step 3 of 3</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Activate Your 7-Day Free Trial</h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
              To complete onboarding, configure payment settings to unlock your **Starter Plan 7-Day Free Trial**. 
              You will not be billed today, and you can cancel anytime.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.01] p-4 text-left space-y-3 max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-white">Starter Plan Care Subscription Includes:</h4>
            <ul className="text-xs text-zinc-400 space-y-2">
              <li className="flex items-center gap-2">
                <Check className="size-3 text-cyan-300 shrink-0" />
                Monitor up to **10 client websites** concurrently.
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3 text-cyan-300 shrink-0" />
                Uptime monitoring at **5-minute intervals**.
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3 text-cyan-300 shrink-0" />
                Slack alert integrations & In-app notifications.
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3 text-cyan-300 shrink-0" />
                Dynamic AI summaries & customized PDF client reports.
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCheckoutRedirect}
              className="flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors w-full sm:w-auto"
            >
              Configure Autopay & Start Trial
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

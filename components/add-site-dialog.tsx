'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';

/**
 * Props for the AddSiteDialog component.
 */
interface AddSiteDialogProps {
  /** The maximum number of sites the organization plan allows. */
  maxSites: number;
  /** The current count of active sites in the organization. */
  activeSitesCount: number;
}

/**
 * AddSiteDialog Component.
 * Implements an accessible HTML5 `<dialog>` modal to allow users to add new websites
 * to their portfolio. It includes:
 * - HTML5 `showModal()` and `close()` modal management via `useRef`.
 * - Custom light-dismiss listener that closes the dialog on clicking the backdrop.
 * - Client-side validation & check limit warnings before allowing submission.
 * - Native form submission sending a POST request to `/api/sites`.
 */
export function AddSiteDialog({ maxSites, activeSitesCount }: AddSiteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Handle clicking outside the dialog content box (light-dismiss fallback)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleLightDismiss = (event: MouseEvent) => {
      // If the target is not the dialog itself, it was a click on child content
      if (event.target !== dialog) return;

      // Determine bounding dimensions of the dialog content box
      const rect = dialog.getBoundingClientRect();
      const isClickInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      // If the click occurred outside the bounding box, it's on the backdrop -> close the dialog
      if (!isClickInside) {
        dialog.close();
      }
    };

    dialog.addEventListener('click', handleLightDismiss);
    return () => {
      dialog.removeEventListener('click', handleLightDismiss);
    };
  }, []);

  const openModal = () => {
    setError(null);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, url, clientName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add site');
      }

      // Reset form
      setName('');
      setUrl('');
      setClientName('');
      closeModal();
      
      // Refresh page data
      router.refresh();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isLimitReached = activeSitesCount >= maxSites;

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 flex items-center gap-1.5"
      >
        <Plus className="size-4" />
        Add site
      </button>

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#0a0f19] p-6 shadow-glow relative focus:outline-none backdrop:bg-black/60 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-md text-zinc-400 transition hover:text-white hover:bg-white/5 p-1"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <h2 id="dialog-title" className="text-xl font-semibold text-white">Add new site</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Set up a website to start monitoring uptime, SSL status, and domain expiration.
        </p>

        {isLimitReached ? (
          <div className="mt-6 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            You have reached your limit of {maxSites} site{maxSites > 1 ? 's' : ''} for your current plan. Please upgrade your workspace to add more sites.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="site-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Site name
              </label>
              <input
                type="text"
                id="site-name"
                required
                placeholder="e.g. Acme Corp Homepage"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="site-url" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Website URL
              </label>
              <input
                type="text"
                id="site-url"
                required
                placeholder="e.g. acme.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="client-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Client name (Optional)
              </label>
              <input
                type="text"
                id="client-name"
                placeholder="e.g. Acme Corporation"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add website'
                )}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

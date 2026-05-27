'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Slack,
  Loader2,
} from 'lucide-react';

interface Notification {
  id: string;
  siteId: string;
  checkResultId: string;
  severity: 'critical' | 'warning' | 'passing';
  issue: string;
  resolvedAt: string | null;
  isRead: boolean;
  createdAt: string;
  site?: {
    name: string;
    url: string;
  };
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'channels'>('alerts');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  // Settings Form State
  const [emailAlert, setEmailAlert] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; success: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const unreads = (data.notifications || []).filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unreads);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch Alert Settings
  const fetchAlertSettings = async () => {
    try {
      const res = await fetch('/api/settings/alerts');
      if (res.ok) {
        const data = await res.json();
        const emailSetting = data.settings?.find((s: { channel: string; config?: { email?: string } }) => s.channel === 'email');
        const slackSetting = data.settings?.find((s: { channel: string; config?: { webhookUrl?: string } }) => s.channel === 'slack');

        if (emailSetting?.config?.email) setEmailAlert(emailSetting.config.email);
        if (slackSetting?.config?.webhookUrl) setSlackWebhook(slackSetting.config.webhookUrl);
      }
    } catch (err) {
      console.error('Failed to load alert settings:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAlertSettings();

    // Auto-refresh unread count every 60s to keep badge live
    const refreshInterval = setInterval(() => {
      fetchNotifications();
    }, 60_000);

    // Click outside listener to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentIds: [id] }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveMessage(null);

    try {
      // Save Email config
      if (emailAlert) {
        await fetch('/api/settings/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'email',
            config: { email: emailAlert.trim() },
          }),
        });
      }

      // Save Slack config
      if (slackWebhook) {
        await fetch('/api/settings/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'slack',
            config: { webhookUrl: slackWebhook.trim() },
          }),
        });
      }

      setSaveMessage({ text: 'Channels saved successfully!', success: true });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ text: 'Error saving settings.', success: false });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications(); // refresh when opening
          }
        }}
        className="relative rounded-full p-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 outline-none"
        aria-label="View notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-rose-500"></span>
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-lg border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header Tabs */}
            <div className="flex border-b border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 outline-none transition-all ${
                  activeTab === 'alerts'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Alerts ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 outline-none transition-all ${
                  activeTab === 'channels'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Channels
              </button>
            </div>

            {/* Content Body */}
            <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-4">
              {activeTab === 'alerts' ? (
                /* Tab: Alerts list */
                <div className="space-y-3">
                  {loadingNotifications && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                      <Loader2 className="animate-spin size-6 text-cyan-300" />
                      <span className="text-xs">Loading incident feed...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 gap-3">
                      <CheckCircle2 className="size-8 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">All channels clear</p>
                        <p className="text-xs text-zinc-500 mt-1">No alerts logged in the last month.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                        <span>Incident Log</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      <div className="divide-y divide-white/5 space-y-2">
                        {notifications.map((notif) => {
                          const dateText = new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={notif.id}
                              className={`group relative flex items-start gap-3 rounded p-2.5 transition-colors border ${
                                !notif.isRead 
                                  ? 'bg-white/[0.03] border-white/5' 
                                  : 'bg-transparent border-transparent'
                              }`}
                            >
                              {/* Left status badge */}
                              {notif.resolvedAt ? (
                                <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                              ) : notif.severity === 'critical' ? (
                                <AlertTriangle className="size-4 text-rose-400 mt-0.5 shrink-0" />
                              ) : (
                                <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
                              )}

                              {/* Notification details */}
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {notif.site?.name || 'Unknown Website'}
                                  </p>
                                  <span className="text-[10px] text-zinc-500 shrink-0">{dateText}</span>
                                </div>
                                <p className="text-xs text-zinc-300 mt-0.5 break-words line-clamp-2">
                                  {notif.issue}
                                </p>
                                {notif.resolvedAt && (
                                  <span className="inline-block text-[10px] text-emerald-400 font-medium mt-1">
                                    Resolved
                                  </span>
                                )}
                              </div>

                              {/* Mark as read checkbox overlay */}
                              {!notif.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 hover:text-emerald-400 text-zinc-500 transition-opacity p-0.5"
                                  title="Mark as read"
                                >
                                  <Check className="size-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Tab: Channels Configuration */
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                      Notification Channels
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Define where Maintly will route alerts when downtime or validation check errors occur.
                    </p>
                  </div>

                  {/* Email Channel */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Mail className="size-3.5 text-cyan-300" />
                      Alert Target Email
                    </label>
                    <input
                      type="email"
                      value={emailAlert}
                      onChange={(e) => setEmailAlert(e.target.value)}
                      placeholder="e.g. alerts@myagency.com"
                      className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50 placeholder:text-zinc-600 transition-colors"
                    />
                  </div>

                  {/* Slack Webhook Channel */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Slack className="size-3.5 text-cyan-300" />
                      Slack Webhook URL
                    </label>
                    <input
                      type="url"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50 placeholder:text-zinc-600 transition-colors"
                    />
                  </div>

                  {saveMessage && (
                    <div
                      className={`text-xs p-2.5 rounded border ${
                        saveMessage.success
                          ? 'bg-emerald-400/5 border-emerald-400/10 text-emerald-300'
                          : 'bg-rose-400/5 border-rose-400/10 text-rose-300'
                      }`}
                    >
                      {saveMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full bg-cyan-400 hover:bg-cyan-500 text-[#080c14] font-semibold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="animate-spin size-3.5" />
                        Saving Channels...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

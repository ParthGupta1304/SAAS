'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Send, 
  Eye, 
  Loader2, 
  Check, 
  X, 
  FileDown 
} from 'lucide-react';

interface Site {
  id: string;
  name: string;
  url: string;
}

interface Report {
  id: string;
  siteId: string;
  month: number;
  year: number;
  status: 'draft' | 'approved' | 'sent';
  pdfUrl: string | null;
  aiSummary: string | null;
  createdAt: Date | string;
  site: Site;
}

export function ReportsManager({
  initialReports,
  sites,
}: {
  initialReports: Report[];
  sites: Site[];
}) {
  const [reportsList, setReportsList] = useState<Report[]>(initialReports);
  
  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  // Form states
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  // Narrative edit state
  const [editedSummary, setEditedSummary] = useState('');
  
  // Loading states
  const [generating, setGenerating] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = [
    String(new Date().getFullYear() - 1),
    String(new Date().getFullYear()),
  ];

  // Helper to format month name
  const getMonthName = (m: number) => {
    return months.find((item) => item.value === String(m))?.label || String(m);
  };

  // Generate Report action
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;

    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          month: Number(selectedMonth),
          year: Number(selectedYear),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      // Prepend to reports list state
      setReportsList((prev) => [data.report, ...prev]);
      setSuccessMsg('Report successfully compiled and saved as draft.');
      setIsGenerateOpen(false);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error occurred while generating report.');
    } finally {
      setGenerating(false);
    }
  };

  // Update Summary (Regenerates PDF)
  const handleUpdateSummary = async () => {
    if (!activeReport) return;
    setSavingSummary(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/reports/${activeReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSummary: editedSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      // Update in reports list
      setReportsList((prev) =>
        prev.map((r) => (r.id === activeReport.id ? data.report : r))
      );
      
      // Update local report being edited
      setActiveReport(data.report);
      setSuccessMsg('Report narrative updated and PDF recompiled.');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error saving changes.');
    } finally {
      setSavingSummary(false);
    }
  };

  // Send PDF via Resend
  const handleSendReport = async (reportId: string) => {
    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Email dispatch failed');
      }

      // Update status in list
      setReportsList((prev) =>
        prev.map((r) => (r.id === reportId ? data.report : r))
      );

      setSuccessMsg(data.message || 'Report sent successfully.');
      setIsEditOpen(false);
      setActiveReport(null);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error sending report.');
    } finally {
      setSending(false);
    }
  };

  // Open Preview Modal
  const openPreview = (report: Report) => {
    setActiveReport(report);
    setEditedSummary(report.aiSummary || '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Maintenance Reports History</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Review monthly metrics summaries, edit AI-generated narratives, and email PDFs to agency admins.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setIsGenerateOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors"
        >
          <Plus className="size-4 text-[#080c14]" />
          Create Report
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-md text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-zinc-500 hover:text-zinc-300">
            <X className="size-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-md text-sm bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-zinc-500 hover:text-zinc-300">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Reports Portfolio List */}
      <div className="glass-panel rounded-lg p-6">
        {reportsList.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/[0.01]">
            <FileText className="mx-auto size-12 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No reports generated yet</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">
              Click the &quot;Create Report&quot; button to compile your first monthly care report.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500 border-b border-white/10">
                <tr>
                  <th className="pb-3 font-medium">Website</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created Date</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportsList.map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-medium text-white">{report.site.name}</td>
                    <td className="py-4 text-zinc-300">{getMonthName(report.month)} {report.year}</td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                          report.status === 'sent'
                            ? 'bg-emerald-300/10 text-emerald-200 border border-emerald-500/20'
                            : report.status === 'approved'
                            ? 'bg-blue-300/10 text-blue-200 border border-blue-500/20'
                            : 'bg-amber-300/10 text-amber-200 border border-amber-500/20'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-4 text-zinc-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button
                        onClick={() => openPreview(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                      >
                        <Eye className="size-3 text-zinc-400" />
                        Preview & Edit
                      </button>
                      {report.status !== 'sent' && (
                        <button
                          onClick={() => handleSendReport(report.id)}
                          disabled={sending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-cyan-400 hover:bg-cyan-300 text-[#080c14] transition-colors disabled:opacity-50"
                        >
                          <Send className="size-3 text-[#080c14]" />
                          Email PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Modal Dialog */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-lg p-6 border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-semibold text-white">Generate Client Report</h3>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Target Website</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !selectedSiteId}
                  className="flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-[#080c14]" />
                      Generating...
                    </>
                  ) : (
                    'Compile Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview & Edit Summary Modal */}
      {isEditOpen && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-5xl rounded-lg p-6 border border-zinc-800 shadow-2xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Preview: {activeReport.site.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  {getMonthName(activeReport.month)} {activeReport.year} — Status: {activeReport.status}
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Split layout: Narrative Editor / PDF Viewer */}
            <div className="flex-1 grid lg:grid-cols-[0.4fr_0.6fr] gap-6 overflow-hidden my-4">
              {/* Left Column: Narrative Editor */}
              <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-sm font-medium text-zinc-300">AI Narrative Summary</label>
                  <p className="text-xs text-zinc-500">
                    This narrative summary was compiled by Gemini. You can edit it below to tailor descriptions before sending.
                  </p>
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="flex-1 w-full min-h-[250px] mt-2 rounded-md border border-white/10 bg-[#070b12] p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-white/5 flex gap-3 justify-start">
                  <button
                    onClick={handleUpdateSummary}
                    disabled={savingSummary || editedSummary === activeReport.aiSummary}
                    className="flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold text-white border border-white/10 transition-colors disabled:opacity-40"
                  >
                    {savingSummary ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        Rebuilding PDF...
                      </>
                    ) : (
                      'Save & Update PDF'
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: PDF Viewer */}
              <div className="flex flex-col border border-white/10 rounded-md bg-white/[0.02] overflow-hidden relative">
                {activeReport.pdfUrl ? (
                  <>
                    <iframe
                      src={`${activeReport.pdfUrl}#toolbar=0`}
                      className="w-full h-full border-0 bg-zinc-900"
                    />
                    <a
                      href={`${activeReport.pdfUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg transition-colors border border-white/10"
                    >
                      <FileDown className="size-3 text-zinc-400" />
                      Open Full PDF
                    </a>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="size-12 text-zinc-600 animate-pulse" />
                    <p className="mt-4 text-sm text-zinc-400">Compiling report PDF file...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                Close Preview
              </button>
              {activeReport.status !== 'sent' && (
                <button
                  onClick={() => handleSendReport(activeReport.id)}
                  disabled={sending || !activeReport.pdfUrl}
                  className="flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#080c14] hover:bg-cyan-300 transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-[#080c14]" />
                      Dispatching email...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 text-[#080c14]" />
                      Approve & Email PDF
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, apiGenerateDocument, ApiError } from "@/lib/api";
import { InternRow } from "@/lib/types";

type DocumentType = "offer" | "certificate";

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  offer: "Offer Letter",
  certificate: "Completion Certificate",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GenerateDocumentsPage() {
  const { user, checking } = useRequireRole("admin");
  const [interns, setInterns] = useState<InternRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [internId, setInternId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");

  const [generatingType, setGeneratingType] = useState<DocumentType | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ interns: InternRow[] }>("/api/admin/interns?status=accepted")
      .then((data) => setInterns(data.interns))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load interns");
      });
  }, [user]);

  // Object URLs must be released or they leak memory for the life of the tab.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedIntern = interns?.find((i) => i.id === internId) ?? null;

  function resetDocument() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDocumentId(null);
    setDocumentType(null);
    setSendError(null);
    setSendSuccess(false);
  }

  async function handleGenerate(type: DocumentType) {
    if (!internId) {
      setGenerateError("Please select an intern first");
      return;
    }
    if (!date) {
      setGenerateError("Please choose a date");
      return;
    }

    setGeneratingType(type);
    setGenerateError(null);
    resetDocument();
    try {
      const { blob, documentId: newId } = await apiGenerateDocument("/api/admin/documents/generate", {
        internId,
        type,
        date,
        description: description.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setDocumentId(newId);
      setDocumentType(type);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Failed to generate document");
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleSendEmail() {
    if (!documentId || !internId) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      await apiFetch(`/api/admin/documents/${documentId}/send`, {
        method: "POST",
        body: JSON.stringify({ internId }),
      });
      setSendSuccess(true);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Generate Documents</h1>
      <p className="text-muted mt-1">
        Create an AI-assisted offer letter or internship completion certificate for an intern.
      </p>

      {loadError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="intern" className="text-sm font-medium text-muted">
              Intern
            </label>
            <select
              id="intern"
              value={internId}
              onChange={(e) => {
                setInternId(e.target.value);
                resetDocument();
                setGenerateError(null);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
            >
              <option value="">Select an intern…</option>
              {interns?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {interns?.length === 0 && (
              <p className="text-xs text-muted">No accepted interns yet.</p>
            )}
          </div>

          {selectedIntern && (
            <div className="rounded-md border border-border bg-background px-3 py-2.5 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted">Name</span>
              <span>{selectedIntern.name}</span>
              <span className="text-muted">Department</span>
              <span>{selectedIntern.department ?? "—"}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-muted">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
            />
            <p className="text-xs text-muted">Start date for offer letters, completion date for certificates.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-muted">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors resize-none"
              placeholder="e.g. worked on the frontend redesign project"
            />
            <p className="text-xs text-muted">
              AI-expanded into a polished paragraph. Leave blank to use a generic default instead.
            </p>
          </div>

          {generateError && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {generateError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              onClick={() => handleGenerate("offer")}
              disabled={generatingType !== null || !internId}
              className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-medium px-4 py-2 transition-colors"
            >
              {generatingType === "offer" ? "Generating..." : "Generate Offer Letter"}
            </button>
            <button
              onClick={() => handleGenerate("certificate")}
              disabled={generatingType !== null || !internId}
              className="rounded-md border border-border hover:border-brand disabled:opacity-60 disabled:cursor-not-allowed text-foreground text-sm font-medium px-4 py-2 transition-colors"
            >
              {generatingType === "certificate" ? "Generating..." : "Generate Completion Certificate"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <h2 className="font-medium">Preview</h2>
          {!previewUrl && (
            <p className="text-sm text-muted">
              Generate a document to see a preview here.
            </p>
          )}
          {previewUrl && documentType && (
            <>
              <iframe
                src={previewUrl}
                title={DOCUMENT_LABELS[documentType]}
                className="w-full h-[520px] rounded-md border border-border bg-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={previewUrl}
                  download={`${DOCUMENT_LABELS[documentType].replace(/\s+/g, "-")}.pdf`}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand transition-colors"
                >
                  Download PDF
                </a>
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  {sending ? "Sending..." : "Send via Email"}
                </button>
              </div>
              {sendSuccess && (
                <p className="text-sm text-emerald-400">
                  Sent to {selectedIntern?.email}.
                </p>
              )}
              {sendError && <p className="text-sm text-danger">{sendError}</p>}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

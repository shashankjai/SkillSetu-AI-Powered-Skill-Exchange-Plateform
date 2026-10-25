// client/src/pages/knovia/KnoviaDocumentsPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, FileText, Trash2, RefreshCw, ExternalLink, Info, MessageSquareText } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, PageHeader, Button, StatusBadge, EmptyState, ErrorBanner, Spinner, formatBytes, formatDate } from "../../components/knovia/ui";

const DEFAULT_LIMITS = { maxDocuments: 25, maxMegabytes: 15, maxPages: 300 };

const KnoviaDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadPct, setUploadPct] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await knoviaApi.listDocuments();
      setDocuments(data.documents);
      if (data.limits) setLimits(data.limits);
      setError("");
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "Could not load your documents."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while anything is still processing.
  const hasProcessing = documents.some((d) => d.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return undefined;
    const t = setInterval(() => load(true), 3000);
    return () => clearInterval(t);
  }, [hasProcessing, load]);

  const upload = async (file) => {
    setUploadError("");
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setUploadError("Only PDF files are supported.");
      return;
    }
    if (file.size === 0) { setUploadError("That file is empty."); return; }
    if (file.size > limits.maxMegabytes * 1048576) {
      setUploadError(`That file is larger than ${limits.maxMegabytes} MB.`);
      return;
    }
    setUploadPct(0);
    try {
      await knoviaApi.uploadDocument(file, setUploadPct);
      await load(true);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Upload failed."));
    } finally {
      setUploadPct(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files?.[0]);
  };

  const act = async (id, fn, errorMsg) => {
    setBusyId(id);
    try { await fn(); await load(true); }
    catch (err) { setError(getErrorMessage(err, errorMsg)); }
    finally { setBusyId(null); setConfirmId(null); }
  };

  const uploading = uploadPct !== null;

  return (
    <>
      <PageHeader
        title="Study Documents"
        subtitle="Upload your own PDFs. They are private to your account and are indexed so you can ask questions and generate quizzes from them."
        actions={documents.some((d) => d.status === "ready") && (
          <Link to="/knovia/ask" className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]">
            <MessageSquareText size={15} aria-hidden="true" /> Ask my PDFs
          </Link>
        )}
      />

      <ErrorBanner message={error} onRetry={() => load()} />

      <Card className="mb-6 p-4 sm:p-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${dragging ? "border-blue-500 bg-blue-950/20" : "border-slate-700 bg-[#0F1829]"}`}
        >
          <UploadCloud size={28} className="mb-2 text-slate-500" aria-hidden="true" />
          <p className="text-sm text-slate-300">Drag a PDF here, or</p>
          <input ref={inputRef} id="pdf-input" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
          <label htmlFor="pdf-input" className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-[#172338] px-3.5 py-2 text-sm font-semibold text-slate-200 hover:bg-[#1d2b45] focus-within:ring-2 focus-within:ring-blue-400 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
            Choose a PDF
          </label>
          <p className="mt-3 text-xs text-slate-500">
            Up to {limits.maxMegabytes} MB and {limits.maxPages} pages. Text-based PDFs only.
          </p>
        </div>

        {uploading && (
          <div className="mt-3" role="status">
            <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Uploading…</span><span>{uploadPct}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-[#2563EB] transition-all" style={{ width: `${uploadPct}%` }} /></div>
          </div>
        )}
        {uploadError && <p role="alert" className="mt-3 text-sm text-red-300">{uploadError}</p>}

        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          Scanned or image-only PDFs have no selectable text and cannot be read yet (no OCR). Password-protected PDFs are rejected.
        </p>
      </Card>

      {loading ? (
        <Spinner label="Loading documents…" />
      ) : documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" body="Upload a PDF — lecture notes, a textbook chapter, a paper — to start asking questions and building quizzes." />
      ) : (
        <ul className="space-y-3">
          {documents.map((d) => (
            <li key={d._id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText size={20} className="mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white" title={d.originalName}>{d.originalName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatBytes(d.sizeBytes)}
                        {d.status === "ready" && ` · ${d.pageCount} pages · ${d.chunkCount} passages indexed`}
                        {` · uploaded ${formatDate(d.createdAt)}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                {d.status === "processing" && <p className="mt-3 text-xs text-slate-400">Extracting text and building the search index. This can take a minute for long documents.</p>}
                {d.status === "failed" && <p role="alert" className="mt-3 rounded-md bg-red-950/30 px-3 py-2 text-xs text-red-200">{d.errorMessage || "Processing failed."}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {confirmId === d._id ? (
                    <>
                      <span className="text-xs text-slate-300">Delete this document and its index?</span>
                      <Button variant="danger" className="!px-2.5 !py-1 text-xs" loading={busyId === d._id} onClick={() => act(d._id, () => knoviaApi.deleteDocument(d._id), "Could not delete the document.")}>Yes, delete</Button>
                      <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirmId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" className="!px-2.5 !py-1 text-xs" onClick={() => act(d._id, () => knoviaApi.openDocument(d._id), "Could not open the file.")}>
                        <ExternalLink size={13} aria-hidden="true" /> Open
                      </Button>
                      {d.status === "failed" && (
                        <Button variant="secondary" className="!px-2.5 !py-1 text-xs" loading={busyId === d._id} onClick={() => act(d._id, () => knoviaApi.reprocessDocument(d._id), "Could not retry processing.")}>
                          <RefreshCw size={13} aria-hidden="true" /> Retry
                        </Button>
                      )}
                      <Button variant="ghost" className="!px-2.5 !py-1 text-xs text-red-300" onClick={() => setConfirmId(d._id)}>
                        <Trash2 size={13} aria-hidden="true" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default KnoviaDocumentsPage;

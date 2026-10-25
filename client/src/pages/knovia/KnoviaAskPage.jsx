// client/src/pages/knovia/KnoviaAskPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Plus, Trash2, FileText, AlertTriangle, MessageSquareText, Quote } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import MarkdownRenderer from "../../components/common/MarkdownRenderer";
import DocumentPicker from "../../components/knovia/DocumentPicker";
import { Card, Button, EmptyState, ErrorBanner, Pill, Spinner, fieldClass } from "../../components/knovia/ui";

const METHOD_LABEL = {
  atlas_vector_search: "MongoDB Atlas Vector Search",
  in_process_cosine: "Exact similarity search (computed in the server)",
};

const Sources = ({ message }) => {
  const sources = message.sources || [];
  if (sources.length === 0) return null;
  const cited = sources.filter((s) => s.cited);
  const others = sources.filter((s) => !s.cited);
  const method = message.retrieval?.method || message.retrievalMethod;

  const Item = ({ s }) => (
    <li className="rounded-lg border border-slate-800 bg-[#0F1829] p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Pill tone={s.cited ? "blue" : "neutral"}>{s.ref}</Pill>
        <span className="font-semibold text-slate-200">{s.documentName}</span>
        <span className="text-slate-500">page {s.pageNumber}</span>
        <span className="ml-auto text-slate-500" title="Cosine similarity between the question and this passage. It indicates closeness in meaning, not the probability that the answer is correct.">
          similarity {s.similarity.toFixed(2)}
        </span>
      </div>
      <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-slate-400"><Quote size={12} className="mt-0.5 shrink-0 text-slate-600" aria-hidden="true" />{s.excerpt}</p>
    </li>
  );

  return (
    <details className="mt-3 group" open={message.grounded}>
      <summary className="cursor-pointer select-none text-xs font-semibold text-slate-400 hover:text-slate-200">
        {message.grounded ? `Sources (${cited.length} cited)` : "Closest passages found (not used for an answer)"}
      </summary>
      <ul className="mt-2 space-y-2">
        {cited.map((s) => <Item key={s.ref} s={s} />)}
        {others.length > 0 && cited.length > 0 && <li className="pt-1 text-[11px] uppercase tracking-wide text-slate-600">Also retrieved</li>}
        {others.map((s) => <Item key={s.ref} s={s} />)}
      </ul>
      {method && <p className="mt-2 text-[11px] text-slate-600">Retrieved with {METHOD_LABEL[method] || method}.</p>}
    </details>
  );
};

const KnoviaAskPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const refreshConversations = useCallback(async () => {
    try { setConversations((await knoviaApi.listConversations()).conversations); } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [d] = await Promise.all([knoviaApi.listDocuments(), refreshConversations()]);
        setDocuments(d.documents);
      } catch (err) {
        setError(getErrorMessage(err, "Could not load your documents."));
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshConversations]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  const readyDocs = documents.filter((d) => d.status === "ready");

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setError("");
    setSending(true);
    setMessages((m) => [...m, { _id: `tmp-${Date.now()}`, role: "user", content: question }]);
    setInput("");
    try {
      const data = await knoviaApi.ask({ question, documentIds: selected, conversationId });
      setConversationId(data.conversationId);
      setMessages((m) => [...m, data.message]);
      refreshConversations();
    } catch (err) {
      setError(getErrorMessage(err, "The question could not be answered."));
      setMessages((m) => m.slice(0, -1));
      setInput(question);
    } finally {
      setSending(false);
    }
  };

  const openConversation = async (id) => {
    setError("");
    try {
      const { conversation } = await knoviaApi.getConversation(id);
      setConversationId(conversation._id);
      setMessages(conversation.messages);
      const readyIds = new Set(readyDocs.map((d) => d._id));
      setSelected((conversation.documents || []).filter((x) => readyIds.has(x)));
    } catch (err) {
      setError(getErrorMessage(err, "Could not open that conversation."));
    }
  };

  const newConversation = () => { setConversationId(null); setMessages([]); setError(""); };

  const removeConversation = async (id) => {
    try {
      await knoviaApi.deleteConversation(id);
      if (id === conversationId) newConversation();
      refreshConversations();
    } catch (err) { setError(getErrorMessage(err, "Could not delete the conversation.")); }
  };

  if (loading) return <Spinner label="Loading…" />;

  if (readyDocs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents are ready yet"
        body="Upload a PDF and wait for it to finish processing, then you can ask questions about it here."
        action={<Link to="/knovia/documents" className="rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]">Go to Study Documents</Link>}
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-white">Search in</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">
            {selected.length === 0 ? `All ${readyDocs.length} ready document${readyDocs.length > 1 ? "s" : ""}` : `${selected.length} selected`}
          </p>
          <DocumentPicker documents={documents} selected={selected} onChange={setSelected} idPrefix="ask" />
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
            <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={newConversation}><Plus size={14} aria-hidden="true" /> New</Button>
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500">Your past questions will appear here.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c._id} className={`group flex items-center gap-1 rounded-lg ${c._id === conversationId ? "bg-blue-950/30" : "hover:bg-[#172338]"}`}>
                  <button onClick={() => openConversation(c._id)} className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm text-slate-300">{c.title}</button>
                  <button onClick={() => removeConversation(c._id)} aria-label={`Delete conversation ${c.title}`} className="p-2 text-slate-600 hover:text-red-300"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>

      <Card className="flex min-h-[520px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {messages.length === 0 && !sending && (
            <EmptyState icon={MessageSquareText} title="Ask about your study material" body="Answers come only from the passages retrieved from your documents, with the page they came from. If the material doesn't cover it, you'll be told." />
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m._id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-[#2563EB] px-3.5 py-2 text-sm text-white">{m.content}</p>
              </div>
            ) : (
              <div key={m._id} className="max-w-[95%]">
                <div className={`rounded-xl rounded-tl-sm border px-4 py-3 text-sm ${m.grounded ? "border-slate-700 bg-[#172338] text-slate-100" : "border-amber-800/60 bg-amber-950/20 text-amber-100"}`}>
                  {!m.grounded && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      <AlertTriangle size={13} aria-hidden="true" /> Not enough evidence
                    </p>
                  )}
                  {m.grounded ? <MarkdownRenderer content={m.content} /> : <p>{m.content}</p>}
                  <Sources message={m} />
                </div>
              </div>
            )
          )}
          {sending && <div className="flex items-center gap-2 text-sm text-slate-400" role="status"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" /> Searching your documents…</div>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-800 p-3 sm:p-4">
          <ErrorBanner message={error} />
          <div className="flex items-end gap-2">
            <label htmlFor="ask-input" className="sr-only">Your question</label>
            <textarea
              id="ask-input"
              rows={2}
              maxLength={1000}
              className={`${fieldClass} resize-none`}
              placeholder="Ask a question about your documents…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={sending}
            />
            <Button onClick={send} loading={sending} disabled={!input.trim()} aria-label="Send question"><Send size={16} /></Button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">Enter to send · Shift+Enter for a new line · {input.length}/1000</p>
        </div>
      </Card>
    </div>
  );
};

export default KnoviaAskPage;

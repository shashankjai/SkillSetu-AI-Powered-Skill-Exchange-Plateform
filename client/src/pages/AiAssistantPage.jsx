// client/src/pages/AiAssistantPage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Background from "../components/background/Background";
import Footer from "../components/footer/Footer";
import MarkdownRenderer from "../components/common/MarkdownRenderer";
import { streamChat } from "../api/streamChat";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Trash2,
  RefreshCw,
  BookOpen,
  AlertCircle,
  ShieldCheck,
  Code2,
  Terminal,
  Copy,
  Check,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const starterQuestions = [
  {
    title: "Platform Rules",
    text: "How do skill swaps and scheduled sessions work on SkillSetu?",
    icon: ShieldCheck,
  },
  {
    title: "Portfolio Ideas",
    text: "Suggest a full-stack Web Development project to showcase my skills.",
    icon: Code2,
  },
  {
    title: "DSA Concepts",
    text: "Explain binary search vs two pointers problem-solving patterns.",
    icon: Terminal,
  },
  {
    title: "Interview Prep",
    text: "How should I structure my answers using the STAR technique in behavioral interviews?",
    icon: BookOpen,
  },
];

const AiAssistantPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [cooldown, setCooldown] = useState(0); // seconds left after a 429 (rate limit)

  const chatThreadRef = useRef(null);
  const chatIsNearBottomRef = useRef(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const token = localStorage.getItem("token");

  // Auto-scroll to bottom safely
  const scrollToBottom = () => {
    const chatThread = chatThreadRef.current;
    if (chatThread && chatIsNearBottomRef.current) {
      // Update the inner chat scroller immediately. Repeated smooth-scroll animations
      // on every streamed token fight each other and make the conversation jitter.
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchHistory();
  }, [token, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Count down the rate-limit cooldown once per second
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleCopy = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg._id);
      setTimeout(() => setCopiedId((id) => (id === msg._id ? null : id)), 1500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const fetchHistory = async () => {
    setIsFetchingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/api/chatbot/history`, {
        headers: { "x-auth-token": token },
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load chat history:", err);
      toast.error("Failed to load conversation history.");
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading || cooldown > 0) return;

    if (trimmed.length > 2000) {
      toast.error("Message exceeds maximum length of 2000 characters.");
      return;
    }

    // Append optimistic user message
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    chatIsNearBottomRef.current = true;
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText("");
    setIsLoading(true);
    setLastFailedMessage(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const aiId = `ai-${Date.now()}`;
    let started = false; // true once the first streamed piece arrived

    try {
      let answer;
      try {
        // Preferred: the answer streams in word by word
        answer = await streamChat({
          apiUrl: API_URL,
          token,
          message: trimmed,
          onToken: (piece) => {
            if (!started) {
              started = true;
              setMessages((prev) => [
                ...prev,
                { _id: aiId, role: "model", content: piece, streaming: true, createdAt: new Date().toISOString() },
              ]);
            } else {
              setMessages((prev) => prev.map((m) => (m._id === aiId ? { ...m, content: m.content + piece } : m)));
            }
          },
        });
      } catch (streamErr) {
        // An older backend without the stream route (404): fall back to the normal request
        if (streamErr.status !== 404 || started) throw streamErr;
        const res = await axios.post(
          `${API_URL}/api/chatbot/message`,
          { message: trimmed },
          { headers: { "x-auth-token": token } }
        );
        answer = res.data;
      }

      const finalMsg = {
        _id: answer.messageId || aiId,
        role: "model",
        content: answer.reply,
        sources: answer.sources || [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) =>
        started ? prev.map((m) => (m._id === aiId ? finalMsg : m)) : [...prev, finalMsg]
      );
    } catch (err) {
      console.error("Chatbot response error:", err);
      // drop a half-written streamed answer: nothing was saved for it on the server
      setMessages((prev) => prev.filter((m) => !m.streaming));
      const status = err.response?.status || err.status;
      if (status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      const rateLimited = status === 429;
      if (rateLimited) {
        const wait = Number(err.response?.headers?.["retry-after"]) || err.retryAfter || 30;
        setCooldown(wait);
      }
      const errMsg = rateLimited
        ? "You are sending messages too fast. Please wait a moment and try again."
        : err.response?.data?.msg ||
          err.message ||
          "The AI Assistant is currently unavailable. Please try again.";

      toast.error(errMsg);
      setLastFailedMessage(trimmed);

      // Append error notification turn
      const errorMsg = {
        _id: `err-${Date.now()}`,
        role: "model",
        content: `⚠️ **Unable to process request:** ${errMsg}`,
        isError: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleClearHistory = async () => {
    try {
      await axios.delete(`${API_URL}/api/chatbot/history`, {
        headers: { "x-auth-token": token },
      });
      setMessages([]);
      toast.success("Chat history cleared.");
    } catch (err) {
      console.error("Failed to clear history:", err);
      toast.error("Failed to clear chat history.");
    } finally {
      setShowClearModal(false);
    }
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "model" && !m.isError)?._id;
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content;

  return (
    <div className="relative min-h-dvh bg-[#FFFEFC] text-slate-900 flex flex-col font-sans">
      <Background />
      <Navbar />
      <ToastContainer position="bottom-right" theme="light" />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 flex flex-col z-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 shadow-lg shadow-slate-900/10 text-white">
              <Bot size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-slate-900">
                SkillSetu AI Assistant
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Grounded Learning Mentor & Peer Exchange Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/20 transition"
              >
                <Trash2 size={14} />
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Chat Thread Container */}
        <div
          ref={chatThreadRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            chatIsNearBottomRef.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 120;
          }}
          className="flex-1 min-h-[320px] max-h-[calc(100dvh-19rem)] sm:max-h-[620px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl flex flex-col gap-4"
        >
          {isFetchingHistory ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="flex items-center gap-3 text-slate-600">
                <RefreshCw size={20} className="animate-spin text-teal-700" />
                <span>Loading conversation history...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State / Starter Questions */
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 mb-4 border border-slate-300">
                <Sparkles size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Welcome to your SkillSetu AI Mentor
              </h2>
              <p className="text-sm text-slate-600 max-w-md mb-8 leading-relaxed">
                Ask about peer skill swapping, study roadmaps, DSA, web development, or technical interview preparation.
              </p>

              {/* Starter Question Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {starterQuestions.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q.text)}
                      className="card-fx flex items-start gap-3 p-4 text-left group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-600 group-hover:text-slate-900 transition">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-700 mb-1">
                          {q.title}
                        </span>
                        <span className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                          {q.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Message Stream */
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-3 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-md ${
                      isUser
                        ? "bg-slate-800 text-white"
                        : msg.isError
                        ? "bg-red-500/20 border border-red-500/30 text-red-600"
                        : "bg-slate-100 border border-slate-200 text-slate-700"
                    }`}
                  >
                    {isUser ? <User size={18} /> : <Bot size={18} />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`w-fit max-w-[88%] sm:max-w-[82%] text-sm ${
                      isUser
                        ? "px-4 py-2.5 bg-slate-900 text-white rounded-lg border border-slate-800 shadow-sm"
                        : msg.isError
                        ? "p-4 bg-red-50 border border-red-500/30 text-red-700 rounded-lg"
                        : "p-4 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg shadow-sm"
                    }`}
                  >
                    {/* Message Header */}
                    <div
                      className={`flex items-center justify-between gap-2 mb-2.5 pb-1.5 border-b text-[11px] font-semibold ${
                        isUser
                          ? "border-slate-700 text-slate-300"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <span>{isUser ? "You" : "SkillSetu Assistant"}</span>
                      {msg.createdAt && (
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Content rendered safely using MarkdownRenderer */}
                    <MarkdownRenderer content={msg.content} isUser={isUser} />

                    {!isUser && !msg.isError && !msg.streaming && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-teal-700"
                        >
                          {copiedId === msg._id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === msg._id ? "Copied" : "Copy"}
                        </button>
                        {msg._id === lastAssistantId && lastUserText && (
                          <button
                            type="button"
                            disabled={isLoading || cooldown > 0}
                            onClick={() => handleSendMessage(lastUserText)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-teal-700 disabled:opacity-40"
                          >
                            <RefreshCw size={12} /> Regenerate
                          </button>
                        )}
                      </div>
                    )}

                    {/* Verified Source Badges */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <span className="block text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-2">
                          Verified Reference Sources:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              <BookOpen size={12} className="text-teal-700" />
                              <span>{src.documentTitle}</span>
                              {src.similarity && (
                                <span className="ml-1 text-[10px] text-slate-700 opacity-80">
                                  ({Math.round(src.similarity * 100)}% match)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isLoading && !messages.some((m) => m.streaming) && (
            <div className="flex items-start gap-3 flex-row">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                <Bot size={18} />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-700 flex items-center gap-3">
                <RefreshCw size={14} className="animate-spin text-teal-700" />
                <span>SkillSetu AI is analyzing knowledge base & formatting response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Retry Alert Banner */}
        {lastFailedMessage && !isLoading && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>Last message failed to send. Would you like to retry?</span>
            </div>
            <button
              onClick={() => handleSendMessage(lastFailedMessage)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-500 transition"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="sticky bottom-0 z-10 mt-4 bg-[#FFFEFC]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xl focus-within:border-teal-600 transition">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about skill swaps, DSA, web dev, roadmaps, or interview prep..."
              rows={1}
              disabled={isLoading || cooldown > 0}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none resize-none max-h-40"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading || cooldown > 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-md hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-700 transition"
            >
              <Send size={18} />
            </button>
          </div>
          {cooldown > 0 && (
            <p role="status" className="mt-2 text-right text-[12px] font-medium text-amber-700">
              Rate limit reached. You can send again in {cooldown}s.
            </p>
          )}
          <span className="block text-[11px] text-slate-500 mt-2 text-right">
            Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 border border-slate-200">Enter</kbd> to send, <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 border border-slate-200">Shift+Enter</kbd> for newline
          </span>
        </div>
      </main>

      {/* Confirmation Modal for Clear History */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Clear Conversation History?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              This will permanently delete all your stored messages with the SkillSetu AI Assistant. Peer-to-peer user chats will not be affected.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AiAssistantPage;

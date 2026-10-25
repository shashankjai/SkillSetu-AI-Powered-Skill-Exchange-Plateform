// client/src/components/common/MarkdownRenderer.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Check, Copy } from "lucide-react";

/**
 * Custom CodeBlock component with language badge and Copy button.
 */
const CodeBlock = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-[#FFFEFC] font-mono text-xs shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 text-[11px] font-semibold text-slate-600">
        <span className="uppercase tracking-wider text-slate-700">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md bg-slate-100/80 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition"
          title="Copy code snippet"
          type="button"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-600" />
              <span className="text-emerald-600 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-slate-900 leading-relaxed font-mono">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

/**
 * Production-Grade Markdown Renderer for AI messages & documentation.
 */
const MarkdownRenderer = ({ content, isUser = false }) => {
  if (!content) return null;

  return (
    <div className={`markdown-content text-sm leading-relaxed space-y-2 break-words ${isUser ? "text-white" : "text-slate-900"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className={`text-xl font-bold mt-4 mb-2 tracking-tight border-b pb-1 ${isUser ? "text-white border-slate-700" : "text-slate-900 border-slate-200"}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg font-bold mt-3 mb-2 tracking-tight ${isUser ? "text-white" : "text-slate-900"}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base font-bold mt-2 mb-1 ${isUser ? "text-white" : "text-slate-900"}`}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-sm font-semibold mt-2 mb-1 ${isUser ? "text-white" : "text-slate-900"}`}>
              {children}
            </h4>
          ),

          // Paragraphs & Text Formatting
          p: ({ children }) => <p className={`mb-2 leading-relaxed ${isUser ? "text-white" : "text-slate-900"}`}>{children}</p>,
          strong: ({ children }) => (
            <strong className={`font-bold ${isUser ? "text-white" : "text-slate-900"}`}>{children}</strong>
          ),
          em: ({ children }) => <em className={`italic ${isUser ? "text-slate-200" : "text-slate-700"}`}>{children}</em>,

          // Lists
          ul: ({ children }) => (
            <ul className={`list-disc pl-5 my-2 space-y-1 ${isUser ? "text-white" : "text-slate-900"}`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal pl-5 my-2 space-y-1 ${isUser ? "text-white" : "text-slate-900"}`}>
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-normal">{children}</li>,

          // Code
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && (match || codeString.includes("\n"))) {
              return (
                <CodeBlock
                  language={match ? match[1] : ""}
                  codeString={codeString}
                />
              );
            }

            return (
              <code
                className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
                  isUser
                    ? "bg-slate-800 text-slate-100 border border-slate-700"
                    : "bg-slate-100/90 border border-slate-200 text-slate-700"
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-slate-300 bg-white/60 pl-4 py-1.5 italic text-slate-700 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 font-semibold hover:underline hover:text-slate-700 transition"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/40 transition">{children}</tr>
          ),
          th: ({ children }) => <th className="px-3 py-2 font-bold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,

          // Horizontal Rule
          hr: () => <hr className="my-4 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

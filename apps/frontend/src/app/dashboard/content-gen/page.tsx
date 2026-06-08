"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Play, StopCircle, Copy, Download, Check, Sparkles } from "lucide-react";
import { useStream } from "@/hooks/useStream";
import { useUsage } from "@/context/UsageContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const FORMATS = [
  { value: "blog-post", label: "Blog Post" },
  { value: "email", label: "Email" },
  { value: "tweet", label: "Tweet Thread" },
  { value: "social-caption", label: "Social Caption" },
  { value: "marketing-copy", label: "Marketing Copy" },
  { value: "product-description", label: "Product Description" },
  { value: "linkedin-post", label: "LinkedIn Post" },
  { value: "youtube-script", label: "YouTube Script" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "persuasive", label: "Persuasive" },
  { value: "educational", label: "Educational" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
];

const LENGTHS = [
  { value: "short", label: "Short (~250 words)" },
  { value: "medium", label: "Medium (~500 words)" },
  { value: "long", label: "Long (~1000 words)" },
];

export default function ContentGenPage() {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("blog-post");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("medium");
  const [copied, setCopied] = useState(false);

  const { refreshUsage } = useUsage();
  const { text, loading, error, start, stop } = useStream("/api/v1/ai/content-gen", {
    onSuccess: refreshUsage,
  });

  const handleGenerate = () => {
    if (!topic.trim()) return;
    start({
      topic,
      format,
      tone,
      audience: audience.trim() || "general audience",
      length,
    });
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${format}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Content Generator</h1>
            <p className="text-xs text-gray-500">Powered by Gemini Pro</p>
          </div>
        </div>
        {text && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
          {/* Left: Input Form */}
          <div className="flex flex-col gap-5 bg-white/[0.02] border border-white/5 rounded-2xl p-5 lg:p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              Configure Content Options
            </h2>

            {/* Topic Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Topic & Main Idea
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should the content be about? E.g., '10 time management tips for remote software developers' or 'Launch announcement for a new organic coffee subscription brand'"
                className="w-full min-h-[120px] px-4 py-3 bg-black/40 border border-white/8 focus:border-pink-500/40 focus:outline-none rounded-xl text-sm text-gray-200 placeholder-gray-600 resize-none transition-colors"
              />
            </div>

            {/* Format & Tone Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-white/8 focus:border-pink-500/40 focus:outline-none text-gray-300 rounded-xl px-3 py-3 transition-colors"
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-[#0f0f17]">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-white/8 focus:border-pink-500/40 focus:outline-none text-gray-300 rounded-xl px-3 py-3 transition-colors"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#0f0f17]">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="E.g., Gen Z students, project managers, tech startups"
                className="w-full px-4 py-3 bg-black/40 border border-white/8 focus:border-pink-500/40 focus:outline-none rounded-xl text-sm text-gray-200 placeholder-gray-600 transition-colors"
              />
            </div>

            {/* Length Button Group */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Target Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLength(l.value)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      length === l.value
                        ? "bg-pink-500/10 border-pink-500/40 text-pink-300 shadow-sm"
                        : "bg-black/20 border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loading ? stop : handleGenerate}
              disabled={!loading && !topic.trim()}
              className={`flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm mt-2 transition-all ${
                loading
                  ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                  : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <StopCircle className="w-4 h-4" /> Stop Generation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Generate Content
                </>
              )}
            </button>
          </div>

          {/* Right: Output Pane */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Generated Output</label>
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-pink-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                  Generating...
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[450px] rounded-2xl border border-white/8 bg-black/20 overflow-y-auto p-5 lg:p-6">
              {!text && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <FileText className="w-12 h-12 text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm max-w-xs">
                    Choose options on the left and click Generate to view the copy
                  </p>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {(text || loading) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed"
                >
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match;
                        return !isInline ? (
                          <SyntaxHighlighter
                            style={oneDark as any}
                            language={match ? match[1] : "text"}
                            PreTag="div"
                            className="rounded-lg text-xs"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-pink-300 text-xs" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-1 h-4 bg-pink-400 animate-pulse align-middle ml-0.5" />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

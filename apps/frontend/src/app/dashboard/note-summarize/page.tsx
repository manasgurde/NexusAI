"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  StopCircle,
  Copy,
  Download,
  Check,
  FileText,
  UploadCloud,
  Loader2,
  AlertCircle,
  X
} from "lucide-react";
import { useStream } from "@/hooks/useStream";
import { useUsage } from "@/context/UsageContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function NoteSummarizerPage() {
  const [textInput, setTextInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshUsage, usage } = useUsage();
  
  const [fileId, setFileId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);
  
  const plan = usage?.plan || "FREE";
  const LIMITS: Record<string, number> = {
    FREE: 2 * 1024 * 1024,      // 2MB
    PRO_299: 10 * 1024 * 1024,  // 10MB
    PRO_599: 25 * 1024 * 1024,  // 25MB
    PRO_999: 50 * 1024 * 1024,  // 50MB
  };
  const limitBytes = LIMITS[plan] || LIMITS.FREE;
  const limitMB = limitBytes / (1024 * 1024);

  const { text, loading, error, start, stop } = useStream("/api/v1/ai/note-summarize", {
    onSuccess: refreshUsage,
  });

  const isThinking = loading && !text;

  const charCount = textInput.length;
  const isInputValid = charCount >= 50;

  const handleSummarize = () => {
    if (!isInputValid) return;
    start({ text: textInput });
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId || !askInput.trim() || asking) return;

    const currentQuestion = askInput.trim();
    setAskInput("");
    setAsking(true);
    setChatMessages((prev) => [...prev, { role: "user", text: currentQuestion }, { role: "assistant", text: "" }]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/note-summarize/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, question: currentQuestion }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get answer");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  partialText += parsed.text;
                  setChatMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = { role: "assistant", text: partialText };
                    return next;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Q&A Error:", err);
      setChatMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: "Error: Failed to obtain answer. Please try again." };
        return next;
      });
    } finally {
      setAsking(false);
      refreshUsage();
    }
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
    a.download = `summary-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    // Client-side validations
    const allowedExtensions = /(\.pdf|\.docx|\.png|\.jpg|\.jpeg|\.webp)$/i;
    if (!allowedExtensions.exec(file.name)) {
      setUploadError("Invalid file type. Only PDF, DOCX, and images (PNG, JPG, WEBP) are supported.");
      setUploading(false);
      return;
    }

    if (file.size > limitBytes) {
      setUploadError(`File is too large. Your plan allows a maximum size of ${limitMB}MB. Please upgrade your subscription to upload larger documents.`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/note-summarize/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to parse file");
      }

      if (data.success && data.text) {
        setTextInput(data.text);
        if (data.fileId) {
          setFileId(data.fileId);
          setChatMessages([]);
        }
      } else {
        throw new Error("No text could be extracted from this file.");
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      setUploadError(err.message || "An error occurred while uploading/parsing the file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Note Summarizer</h1>
            <p className="text-xs text-gray-500">Powered by Gemini Flash</p>
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
          {/* Left: Input Panel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Source Document / Note
              </label>
              <span className={`text-xs ${isInputValid ? "text-gray-500" : "text-amber-400 font-medium"}`}>
                {charCount} / 50 characters min
              </span>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl px-6 py-6 transition-all duration-200 text-center flex flex-col items-center justify-center cursor-pointer ${
                dragActive
                  ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5 scale-[1.01]"
                  : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
              onClick={onButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-gray-400">Extracting text from file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-1.5">
                    <UploadCloud className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-xs font-semibold text-white">
                    Drag & drop or <span className="text-amber-400 hover:text-amber-300 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-500 leading-normal max-w-[280px]">
                    PDF, DOCX, or Images (PNG, JPG, WEBP) up to {limitMB}MB ({plan === "FREE" ? "Free Limit" : `${plan.replace("PRO_", "Pro ₹")} Limit`})
                  </p>
                </div>
              )}

              {/* Upload Error Alert */}
              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-[#0f0f17]/95 rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center gap-2 z-10 border border-red-500/20"
                  >
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 leading-relaxed max-w-[280px] font-medium">
                      {uploadError}
                    </p>
                    <button
                      onClick={() => setUploadError(null)}
                      className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-white border border-white/5 bg-white/5 rounded-md px-2 py-1 transition-colors"
                    >
                      <X className="w-3 h-3" /> Dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setFileId(null);
              }}
              placeholder="Or paste your notes, lecture transcript, article, or meeting minutes here (minimum 50 characters)..."
              className="flex-1 w-full min-h-[260px] px-4 py-4 bg-black/40 border border-white/8 focus:border-amber-500/40 focus:outline-none rounded-xl text-sm text-gray-200 placeholder-gray-700 resize-none transition-colors"
            />

            <button
              onClick={loading ? stop : handleSummarize}
              disabled={!loading && !isInputValid}
              className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                loading
                  ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <StopCircle className="w-4 h-4" /> Stop summarizing
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Summarize Document
                </>
              )}
            </button>
          </div>

          {/* Right: Summary Output & Q&A Panel */}
          <div className="flex flex-col gap-4 h-full min-h-[500px]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Summary & Key Insights</label>
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Summarizing...
                </div>
              )}
            </div>

            <div className={`rounded-xl border border-white/8 bg-black/20 p-5 ${fileId && text ? "max-h-[300px] overflow-y-auto" : "flex-1 overflow-y-auto"}`}>
              {!text && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Sparkles className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-gray-600 text-sm max-w-xs">
                    Paste text or upload a file and click Summarize to get structural takeaways and insights
                  </p>
                </div>
              )}

              {/* Thinking indicator */}
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4"
                >
                  <div className="flex gap-1.5">
                    {[0,1,2].map((i) => (
                      <span key={i} className="w-2 h-2 rounded-full bg-amber-400"
                        style={{ animation: "nexus-typing-dot 1.2s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Summarizing your document...</p>
                  <style>{`@keyframes nexus-typing-dot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }`}</style>
                </motion.div>
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
                  className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-h2:border-b prose-h2:border-white/5 prose-h2:pb-2 prose-h2:mt-6 first:prose-h2:mt-0"
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
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 text-xs" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-1 h-4 bg-amber-400 animate-pulse align-middle ml-0.5" />
                  )}
                </motion.div>
              )}
            </div>

            {/* Document Q&A (RAG) */}
            {fileId && text && (
              <div className="flex-1 flex flex-col min-h-[300px] border border-white/8 rounded-xl bg-black/40 overflow-hidden">
                <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">Ask Document Q&A</span>
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 font-medium">RAG Mode</span>
                </div>
                
                {/* Q&A Message history */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs max-h-[220px]">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6 text-gray-500">
                      <p>Ask a specific question about this document.</p>
                      <p className="text-[10px] text-gray-600 mt-1">E.g., "What are the main financial numbers?"</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-100 ml-auto"
                            : "bg-white/[0.03] border border-white/5 text-gray-200"
                        }`}
                      >
                        {msg.role === "assistant" && !msg.text ? (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            Analyzing document...
                          </div>
                        ) : (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Q&A Input form */}
                <form onSubmit={handleAsk} className="p-3 bg-white/[0.01] border-t border-white/5 flex gap-2">
                  <input
                    type="text"
                    value={askInput}
                    onChange={(e) => setAskInput(e.target.value)}
                    placeholder="Ask a question about this document..."
                    disabled={asking}
                    className="flex-1 px-3 py-1.5 bg-black/40 border border-white/8 focus:border-amber-500/40 focus:outline-none rounded-lg text-xs text-gray-200 placeholder-gray-600 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={asking || !askInput.trim()}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-amber-500/10 disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, Play, StopCircle, Copy, Download, Check,
  UploadCloud, AlertCircle, X
} from "lucide-react";
import { useStream } from "@/hooks/useStream";
import { useUsage } from "@/context/UsageContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";

const LANGUAGES = [
  "javascript", "typescript", "python", "java", "c", "cpp", "csharp",
  "go", "rust", "php", "ruby", "swift", "kotlin", "sql", "bash", "html", "css",
];

export default function CodeReviewPage() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshUsage } = useUsage();
  
  const { text, loading, error, start, stop } = useStream("/api/v1/ai/code-review", {
    onSuccess: refreshUsage,
  });

  const handleReview = () => {
    if (!code.trim()) return;
    start({ code, language });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-review-${Date.now()}.md`;
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCodeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCodeFile(e.target.files[0]);
    }
  };

  const handleCodeFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content.trim()) {
        toast.error("The selected file is empty.");
        return;
      }

      setCode(content);

      // Auto-detect language based on file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      let detectedLang = "";

      if (ext) {
        if (LANGUAGES.includes(ext)) {
          detectedLang = ext;
        } else {
          // Map popular extensions to supported languages
          switch (ext) {
            case "js":
            case "jsx":
              detectedLang = "javascript";
              break;
            case "ts":
            case "tsx":
              detectedLang = "typescript";
              break;
            case "py":
            case "pyw":
              detectedLang = "python";
              break;
            case "h":
            case "cc":
            case "cpp":
            case "cxx":
              detectedLang = "cpp";
              break;
            case "cs":
              detectedLang = "csharp";
              break;
            case "sh":
              detectedLang = "bash";
              break;
            case "yml":
            case "yaml":
            case "json":
              detectedLang = "javascript"; // fallback styling
              break;
          }
        }
      }

      if (detectedLang) {
        setLanguage(detectedLang);
        toast.success(`Successfully loaded ${file.name} (Auto-detected: ${detectedLang})`);
      } else {
        toast.success(`Successfully loaded ${file.name}`);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file content");
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Code Reviewer</h1>
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
          {/* Left: Input */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Your Code</label>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs bg-white/5 border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 capitalize"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l} className="bg-[#0f0f17]">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl px-4 py-4 transition-all duration-200 text-center flex flex-col items-center justify-center cursor-pointer ${
                dragActive
                  ? "border-violet-500 bg-violet-500/5 scale-[1.01]"
                  : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.sql,.sh,.txt"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">
                    Drag & drop code file or <span className="text-violet-400 hover:text-violet-300 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Any text-based code file, language will auto-detect
                  </p>
                </div>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Paste your ${language} code here...\n\nfunction example() {\n  // Your code\n}`}
              className="flex-1 w-full min-h-[300px] px-4 py-4 bg-black/40 border border-white/8 focus:border-violet-500/40 focus:outline-none rounded-xl text-sm text-gray-200 font-mono placeholder-gray-700 resize-none transition-colors"
              spellCheck={false}
            />

            <button
              onClick={loading ? stop : handleReview}
              disabled={!loading && !code.trim()}
              className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                loading
                  ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <StopCircle className="w-4 h-4" /> Stop Review
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Review Code
                </>
              )}
            </button>
          </div>

          {/* Right: Output */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Review Results</label>
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-violet-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Analyzing...
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[400px] rounded-xl border border-white/8 bg-black/20 overflow-y-auto p-5">
              {!text && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Code2 className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-gray-600 text-sm">
                    Paste your code or upload a file and click Review to get AI analysis
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
                  className="prose prose-invert prose-sm max-w-none"
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
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 text-xs" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse align-middle ml-0.5" />
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

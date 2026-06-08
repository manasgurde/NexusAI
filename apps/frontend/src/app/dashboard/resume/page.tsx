"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch,
  Sparkles,
  UploadCloud,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
} from "lucide-react";
import { useUsage } from "@/context/UsageContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ResumeAnalyzerPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"checklist" | "keywords" | "recommendations">("checklist");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshUsage, usage } = useUsage();

  const plan = usage?.plan || "FREE";
  const LIMITS: Record<string, number> = {
    FREE: 2 * 1024 * 1024,      // 2MB
    PRO_299: 10 * 1024 * 1024,  // 10MB
    PRO_599: 25 * 1024 * 1024,  // 25MB
    PRO_999: 50 * 1024 * 1024,  // 50MB
  };
  const limitBytes = LIMITS[plan] || LIMITS.FREE;
  const limitMB = limitBytes / (1024 * 1024);

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

    const allowedExtensions = /(\.pdf|\.docx)$/i;
    if (!allowedExtensions.exec(file.name)) {
      setUploadError("Invalid file type. Only PDF and Word documents (.docx) are supported.");
      setUploading(false);
      return;
    }

    if (file.size > limitBytes) {
      setUploadError(`File is too large. Your plan allows a maximum size of ${limitMB}MB. Please upgrade to a higher plan to upload larger resumes.`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/resume/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to parse resume file");
      }

      if (data.success && data.text) {
        setResumeText(data.text);
      } else {
        throw new Error("No text could be extracted from this resume.");
      }
    } catch (err: any) {
      console.error("Resume file upload error:", err);
      setUploadError(err.message || "An error occurred while uploading/parsing the resume.");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() || analyzing) return;

    setAnalyzing(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/resume/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim() || undefined,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze resume.");
      }

      if (data.success && data.data) {
        setAnalysisData(data.data);
      } else {
        throw new Error("No analysis details returned from the server.");
      }
    } catch (err: any) {
      console.error("Resume analysis error:", err);
      setError(err.message || "An error occurred while analyzing the resume.");
    } finally {
      setAnalyzing(false);
      refreshUsage();
    }
  };

  // Circular progress ring helper
  const CircularProgress = ({ score, size = 120, strokeWidth = 10, colorClass = "text-teal-400" }: { score: number; size?: number; strokeWidth?: number; colorClass?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            className="text-white/[0.04]"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Active progress circle */}
          <circle
            className={`transition-all duration-1000 ease-out ${colorClass}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-extrabold text-white">{score}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center animate-pulse">
            <FileSearch className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Resume Analyzer</h1>
            <p className="text-xs text-gray-500">Powered by Gemini AI</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
          {/* Left Column: Form inputs */}
          <div className="flex flex-col gap-6">
            {/* Upload Zone */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                Upload Resume (PDF or DOCX)
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl px-6 py-6 transition-all duration-200 text-center flex flex-col items-center justify-center cursor-pointer ${
                  dragActive
                    ? "border-teal-500 bg-teal-500/5 shadow-md shadow-teal-500/5 scale-[1.01]"
                    : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                }`}
                onClick={onButtonClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  disabled={uploading || analyzing}
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <p className="text-xs text-gray-400">Extracting resume content...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center mb-1.5">
                      <UploadCloud className="w-5 h-5 text-teal-400" />
                    </div>
                    {resumeText ? (
                      <p className="text-xs font-semibold text-green-400">
                        Resume content loaded successfully!
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-white">
                        Drag & drop your resume or <span className="text-teal-400 hover:text-teal-300 underline">browse</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500 leading-normal max-w-[280px]">
                      PDF or DOCX up to {limitMB}MB ({plan === "FREE" ? "Free Limit" : `${plan.replace("PRO_", "Pro ₹")} Limit`})
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
            </div>

            {/* Optional Job Description */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                Paste Job Description (Optional)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job requirements here to analyze matching keywords and suitability..."
                className="w-full min-h-[160px] px-4 py-3 bg-black/40 border border-white/8 focus:border-teal-500/40 focus:outline-none rounded-xl text-sm text-gray-200 placeholder-gray-700 resize-none transition-colors"
                disabled={analyzing}
              />
            </div>

            {/* Resume Content Preview (Collapsible) */}
            {resumeText && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setResumeText("")}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear loaded resume
                </button>
              </div>
            )}

            {/* Trigger Button */}
            <button
              onClick={handleAnalyze}
              disabled={!resumeText || analyzing}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Resume...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Analyze ATS & Compatibility
                </>
              )}
            </button>
          </div>

          {/* Right Column: Analysis Output */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold text-white">Analysis Results</label>

            <div className="flex-1 min-h-[450px] border border-white/8 rounded-2xl bg-black/20 overflow-y-auto p-6 flex flex-col relative">
              <AnimatePresence mode="wait">
                {/* 1. Empty State */}
                {!analysisData && !analyzing && !error && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-20"
                  >
                    <FileSearch className="w-12 h-12 text-gray-800 mb-4" />
                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                      Upload your resume PDF/DOCX and click Analyze to receive score calculations and ATS reports
                    </p>
                  </motion.div>
                )}

                {/* 2. Loading State */}
                {analyzing && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3"
                  >
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <p className="text-sm text-gray-400">Running ATS checks and parsing content...</p>
                  </motion.div>
                )}

                {/* 3. Error State */}
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3"
                  >
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-red-400 leading-relaxed max-w-xs">{error}</p>
                  </motion.div>
                )}

                {/* 4. Display Analysis Data */}
                {analysisData && !analyzing && (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 flex-1 flex flex-col"
                  >
                    {/* Scores container */}
                    <div className="flex items-center justify-center gap-12 py-3 bg-white/[0.02] border border-white/5 rounded-2xl shadow-inner">
                      <div className="flex flex-col items-center">
                        <CircularProgress score={analysisData.score} colorClass="text-teal-400" />
                        <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Overall ATS Score</span>
                      </div>
                      
                      {analysisData.matchScore !== null && (
                        <div className="flex flex-col items-center">
                          <CircularProgress score={analysisData.matchScore} colorClass="text-purple-400" />
                          <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">Job Compatibility</span>
                        </div>
                      )}
                    </div>

                    {/* Tabs navigation */}
                    <div className="flex border-b border-white/5 gap-1.5 p-1 bg-white/[0.01] rounded-lg">
                      <button
                        onClick={() => setActiveTab("checklist")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          activeTab === "checklist"
                            ? "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Checklist
                      </button>
                      <button
                        onClick={() => setActiveTab("keywords")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          activeTab === "keywords"
                            ? "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Keywords
                      </button>
                      <button
                        onClick={() => setActiveTab("recommendations")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          activeTab === "recommendations"
                            ? "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Recommendations
                      </button>
                    </div>

                    {/* Tab panels */}
                    <div className="flex-1 text-xs">
                      {activeTab === "checklist" && (
                        <div className="space-y-4">
                          {/* Strengths */}
                          <div className="space-y-2">
                            <h3 className="font-bold text-green-400 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5" /> Key Strengths
                            </h3>
                            <ul className="space-y-1.5">
                              {analysisData.strengths?.map((str: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Improvements */}
                          <div className="space-y-2 pt-2">
                            <h3 className="font-bold text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> Areas for Improvement
                            </h3>
                            <ul className="space-y-1.5">
                              {analysisData.improvements?.map((imp: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {activeTab === "keywords" && (
                        <div className="space-y-4">
                          {/* Keywords Found */}
                          <div className="space-y-2">
                            <h3 className="font-bold text-teal-400">Keywords Identified</h3>
                            {analysisData.keywordsFound?.length === 0 ? (
                              <p className="text-gray-500 italic">No skills identified.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {analysisData.keywordsFound?.map((kw: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md font-semibold text-[10px]">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Keywords Missing */}
                          <div className="space-y-2 pt-2">
                            <h3 className="font-bold text-purple-400">Missing Key Skills</h3>
                            {analysisData.keywordsMissing?.length === 0 ? (
                              <p className="text-gray-500 italic">No missing skills found.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {analysisData.keywordsMissing?.map((kw: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md font-semibold text-[10px]">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "recommendations" && (
                        <div className="space-y-2">
                          <h3 className="font-bold text-cyan-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" /> Recruiter Optimization Tips
                          </h3>
                          <ul className="space-y-2.5 mt-2">
                            {analysisData.recommendations?.map((rec: string, idx: number) => (
                              <li key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-gray-300 leading-relaxed flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

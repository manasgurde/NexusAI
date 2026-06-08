"use client";

import { motion } from "framer-motion";
import { FileSearch, Sparkles } from "lucide-react";

export default function ResumeAnalyzerPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white/[0.02] border border-white/5 rounded-2xl p-8 lg:p-10 flex flex-col items-center shadow-xl shadow-teal-500/5"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
          <FileSearch className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Resume Analyzer</h1>
        <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full mb-6 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Coming in Phase 3
        </div>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Soon you'll be able to upload your resume to get an instant ATS score check, identify matching keywords, map strengths, and receive tailored improvement tips.
        </p>
        <div className="w-full h-px bg-white/5 mb-6" />
        <span className="text-xs text-gray-600">
          Upload and review features will support PDF and Word document formats.
        </span>
      </motion.div>
    </div>
  );
}

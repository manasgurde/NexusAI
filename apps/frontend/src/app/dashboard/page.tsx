"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useUsage } from "@/context/UsageContext";
import {
  MessageSquare, Code2, FileText, Sparkles, Image, FileSearch,
  ArrowRight, Zap, Loader2
} from "lucide-react";

const tools = [
  {
    href: "/dashboard/chatbot",
    icon: MessageSquare,
    label: "AI Chatbot",
    desc: "Multi-turn conversations with streaming AI responses",
    color: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-500/20",
    ready: true,
  },
  {
    href: "/dashboard/code-review",
    icon: Code2,
    label: "Code Reviewer",
    desc: "Detect bugs, security issues, and get refactored code",
    color: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/20",
    ready: true,
  },
  {
    href: "/dashboard/content-gen",
    icon: FileText,
    label: "Content Generator",
    desc: "Generate blogs, emails, social copy, and more",
    color: "from-pink-500 to-rose-500",
    shadow: "shadow-pink-500/20",
    ready: true,
  },
  {
    href: "/dashboard/note-summarize",
    icon: Sparkles,
    label: "Note Summarizer",
    desc: "Summarize any text into key points and insights",
    color: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/20",
    ready: true,
  },
  {
    href: "/dashboard/image-gen",
    icon: Image,
    label: "Image Generator",
    desc: "Create AI-generated images from text prompts",
    color: "from-green-500 to-emerald-500",
    shadow: "shadow-green-500/20",
    ready: true,
  },
  {
    href: "/dashboard/resume",
    icon: FileSearch,
    label: "Resume Analyzer",
    desc: "Get ATS score, strengths, and improvement tips",
    color: "from-teal-500 to-cyan-600",
    shadow: "shadow-teal-500/20",
    ready: true,
  },
];

export default function DashboardHome() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { usage, loading } = useUsage();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || usage?.user?.name?.split(" ")[0] || "there";

  const formatPlanName = (plan: string) => {
    if (plan === "FREE") return "Free";
    return plan.replace("PRO_", "Pro ₹");
  };

  // Tool card with instant navigation feedback
  function ToolCard({ tool, index }: { tool: (typeof tools)[0]; index: number }) {
    const [isPending, startTransition] = useTransition();
    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
      if (!tool.ready) return;
      setClicked(true);
      startTransition(() => {
        router.push(tool.href);
      });
    };

    const isNavigating = isPending || clicked;

    return (
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
      >
        <button
          onClick={handleClick}
          disabled={!tool.ready}
          className={`group relative w-full text-left rounded-2xl border bg-gradient-to-b from-white/[0.02] to-transparent transition-all duration-500 p-6 overflow-hidden ${
            !tool.ready
              ? "opacity-40 cursor-not-allowed border-white/5"
              : isNavigating
              ? "border-indigo-500/40 bg-indigo-500/5 shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] -translate-y-1"
              : "border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.1)]"
          }`}
        >
          {/* Ambient hover glow */}
          <div className={`absolute -inset-px bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 pointer-events-none ${
            isNavigating ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`} />

          <div className="flex items-start justify-between mb-5 relative z-10">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${tool.color} flex items-center justify-center shadow-lg ${tool.shadow} transition-transform duration-500 ${
              isNavigating ? "scale-110" : "group-hover:scale-110"
            }`}>
              <tool.icon className="w-5 h-5 text-white" />
            </div>
            {!tool.ready ? (
              <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                Coming Soon
              </span>
            ) : (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                isNavigating
                  ? "bg-indigo-500/20 border border-indigo-500/40"
                  : "bg-white/[0.02] border border-white/5 group-hover:bg-indigo-500/15 group-hover:border-indigo-500/30"
              }`}>
                {isNavigating ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-300" />
                )}
              </div>
            )}
          </div>

          <div className="relative z-10">
            <h3 className={`font-extrabold text-base mb-1.5 transition-colors ${
              isNavigating ? "text-indigo-300" : "text-white group-hover:text-indigo-300"
            }`}>
              {tool.label}
            </h3>
            <p className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors">
              {tool.desc}
            </p>
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-6xl mx-auto overflow-hidden">
      {/* Premium Tech Grid & Ambient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-12">
        {/* Header with Top-Right Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> NexusAI Workspace
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Welcome back, <span className="bg-gradient-to-r from-indigo-200 via-purple-300 to-indigo-100 bg-clip-text text-transparent">{firstName}</span> 👋
            </h1>
            <p className="mt-2 text-gray-400 text-sm max-w-md">
              Your AI workspace is ready. Pick a tool below to get started.
            </p>
          </motion.div>

          {/* Top Right Corner Buttons (Plan & Requests Counter) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-wrap items-center gap-4 md:self-start md:mt-2"
          >
            {/* Requests Today Counter */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-md">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div className="text-left">
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold leading-none mb-1">Quota Today</p>
                <p className="text-sm font-bold text-white leading-none">
                  {usage ? `${usage.requestsToday} / ${usage.requestLimit}` : "0 / 10"}
                </p>
              </div>
            </div>

            {/* Premium Plan Button */}
            <Link href="/dashboard/billing">
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden rounded-xl p-[1px] focus:outline-none cursor-pointer"
              >
                {/* Glowing gradient background */}
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500" />
                
                <div className="relative flex items-center gap-2.5 px-5 py-3 rounded-[11px] bg-black/80 hover:bg-black/70 transition-colors duration-300">
                  <Zap className="w-5 h-5 text-indigo-400 group-hover:text-yellow-400 transition-colors duration-300 fill-indigo-400/20 group-hover:fill-yellow-400/20" />
                  <div className="text-left">
                    <p className="text-[9px] text-indigo-200 group-hover:text-white uppercase tracking-wider font-bold leading-none mb-1 transition-colors">Active Plan</p>
                    <p className="text-sm font-extrabold text-white leading-none">
                      {formatPlanName(usage?.plan || "FREE")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Tool cards */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">
            AI Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {tools.map((tool, i) => (
              <ToolCard key={tool.href} tool={tool} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

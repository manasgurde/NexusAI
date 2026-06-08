"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useUsage } from "@/context/UsageContext";
import {
  Zap, Home, MessageSquare, Code2, FileText, Sparkles, Image,
  FileSearch, LogOut, Settings, X, Menu, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/chatbot", label: "AI Chatbot", icon: MessageSquare },
  { href: "/dashboard/code-review", label: "Code Reviewer", icon: Code2 },
  { href: "/dashboard/content-gen", label: "Content Generator", icon: FileText },
  { href: "/dashboard/note-summarize", label: "Note Summarizer", icon: Sparkles },
  { href: "/dashboard/image-gen", label: "Image Generator", icon: Image, soon: true },
  { href: "/dashboard/resume", label: "Resume Analyzer", icon: FileSearch, soon: true },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      } ${item.soon ? "opacity-50 pointer-events-none" : ""}`}
    >
      <item.icon
        className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"}`}
      />
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-gray-500">Soon</span>
      )}
      {active && <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usage } = useUsage();

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const formatPlanName = (plan: string) => {
    if (plan === "FREE") return "Free";
    return plan.replace("PRO_", "Pro ₹");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm tracking-tight">NexusAI</span>
          <p className="text-xs text-gray-500 leading-none mt-0.5">AI Workspace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2">
          Tools
        </p>
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item)}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Usage quota card */}
      {usage && (
        <div className="mx-3 my-2 p-3 bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            <span>Requests Limit</span>
            <span className="text-indigo-400 font-bold">{formatPlanName(usage.plan)}</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((usage.requestsToday / usage.requestLimit) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500">Today</span>
            <span className="text-gray-300 font-medium">{usage.requestsToday} / {usage.requestLimit}</span>
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="border-t border-white/5 p-3">
        {/* User info clickable (redirects to settings) */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
        >
          {usage?.user?.image || session?.user?.image ? (
            <img
              src={usage?.user?.image || session?.user?.image || ""}
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
              alt="Profile Pic"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 group-hover:scale-105 transition-transform duration-300">
              {(usage?.user?.name || session?.user?.name)?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate transition-colors group-hover:text-indigo-300">
              {usage?.user?.name || session?.user?.name || "User"}
            </p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {usage?.user?.email || session?.user?.email || ""}
            </p>
          </div>
          
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-all group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/80 backdrop-blur border border-white/10 text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-64 z-50 bg-[#0f0f17] border-r border-white/5 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0f0f17] border-r border-white/5">
        <SidebarContent />
      </div>
    </>
  );
}

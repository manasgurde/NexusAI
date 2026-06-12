"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUsage } from "@/context/UsageContext";
import { apiFetch } from "@/utils/apiFetch";
import {
  Zap, Home, MessageSquare, Code2, FileText, Sparkles, Image,
  FileSearch, LogOut, Settings, X, Menu, ChevronRight,
  ChevronDown, ChevronLeft, Building, Plus, Check, Loader2, Shield, PanelLeftClose, PanelLeft
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/chatbot", label: "AI Chatbot", icon: MessageSquare },
  { href: "/dashboard/code-review", label: "Code Reviewer", icon: Code2 },
  { href: "/dashboard/content-gen", label: "Content Generator", icon: FileText },
  { href: "/dashboard/note-summarize", label: "Note Summarizer", icon: Sparkles },
  { href: "/dashboard/image-gen", label: "Image Generator", icon: Image },
  { href: "/dashboard/resume", label: "Resume Analyzer", icon: FileSearch },
  { href: "/dashboard/team", label: "Team Space", icon: Settings },
  { href: "/dashboard/admin", label: "Admin Portal", icon: Shield, adminOnly: true },
];

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isHighlighted = active || isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    startTransition(() => {
      router.push(item.href);
    });
  };

  return (
    <button
      onClick={handleClick}
      title={collapsed ? item.label : undefined}
      className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
        isHighlighted
          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
          : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
      } ${collapsed ? "justify-center px-2.5" : ""}`}
    >
      <item.icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          isHighlighted ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
        }`}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {isPending && !active ? (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          ) : active ? (
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          ) : null}
        </>
      )}
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  // Desktop: open by default; controlled by toggle
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: closed by default; toggled by hamburger
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usage, refreshUsage } = useUsage();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeOrgName, setActiveOrgName] = useState("NexusAI Workspace");
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const getCookie = (name: string) => {
    try {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)"));
      if (match) return match[2];
    } catch (e) {}
    return null;
  };

  const fetchOrgs = async () => {
    try {
      const res = await apiFetch("/api/v1/organizations");
      const result = await res.json();
      if (res.ok && result.success) {
        setOrganizations(result.data || []);
        const activeId = getCookie("x-organization-id");
        if (activeId) {
          const current = result.data.find((o: any) => o.id === activeId);
          if (current) {
            setActiveOrgName(current.name);
          } else if (result.data.length > 0) {
            setActiveOrgName(result.data[0].name);
            document.cookie = `x-organization-id=${result.data[0].id}; path=/`;
          }
        } else if (result.data.length > 0) {
          setActiveOrgName(result.data[0].name);
          document.cookie = `x-organization-id=${result.data[0].id}; path=/`;
        }
      }
    } catch (e) {
      console.error("Failed to load organizations:", e);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [usage]);

  const handleSwitchOrg = (orgId: string, orgName: string) => {
    document.cookie = `x-organization-id=${orgId}; path=/`;
    setActiveOrgName(orgName);
    setShowDropdown(false);
    toast.success(`Switched to workspace: ${orgName}`);
    refreshUsage();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const res = await apiFetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Workspace created successfully!");
        setNewOrgName("");
        await fetchOrgs();
        handleSwitchOrg(result.data.id, result.data.name);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const formatPlanName = (plan: string) => {
    if (plan === "FREE") return "Free";
    return plan.replace("PRO_", "Pro Tier");
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return usage?.user?.role === "ADMIN";
    }
    return true;
  });

  // --- Shared sidebar content (rendered in both desktop and mobile) ---
  const SidebarContent = ({ onClose, isCollapsed }: { onClose?: () => void; isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header with workspace switcher */}
      <div className="relative border-b border-white/5 px-3 py-3.5 z-50 flex items-center gap-2">
        {isCollapsed ? (
          /* Collapsed: show toggle button and workspace icon */
          <div className="w-full flex flex-col items-center gap-2.5">
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400 hover:text-white transition-all shrink-0"
              title="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCollapsed(false)}
              title="Expand Sidebar"
              className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Building className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          </div>
        ) : (
          /* Expanded: show workspace switcher and optionally the toggle button */
          <>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex-1 flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all text-left group min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Building className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-white text-xs tracking-tight truncate">{activeOrgName}</span>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5 flex items-center gap-1 font-medium">
                  Workspace <ChevronDown className="w-2.5 h-2.5 text-gray-500 group-hover:text-white transition-colors" />
                </p>
              </div>
            </button>
            {!onClose && (
              <button
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {!isCollapsed && showDropdown && (
          <div className="absolute top-full left-3 right-3 mt-1.5 p-2 rounded-2xl border border-white/10 bg-[#0f0f1c]/95 backdrop-blur-xl shadow-2xl space-y-3 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-200">
            <div className="max-h-48 overflow-y-auto space-y-1">
              <p className="text-[9px] uppercase font-bold text-gray-500 px-2.5 py-1 tracking-wider">Select Workspace</p>
              {organizations.map((org) => {
                const isSelected = org.name === activeOrgName;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id, org.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-600/10 text-indigo-300 font-bold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-white/5 pt-2">
              <form onSubmit={handleCreateOrg} className="flex gap-1.5 px-1.5">
                <input
                  type="text"
                  placeholder="New Workspace..."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  disabled={creatingOrg}
                  className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={creatingOrg || !newOrgName.trim()}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                >
                  {creatingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-3"}`}>
        {!isCollapsed && (
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2">
            Tools & Settings
          </p>
        )}
        {filteredNavItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item)}
            collapsed={!!isCollapsed}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Usage quota card */}
      {usage && !isCollapsed && (
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

      {/* Collapsed: small usage ring */}
      {usage && isCollapsed && (
        <div className="mx-2 mb-2 flex flex-col items-center gap-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-indigo-400"
            title={`${usage.requestsToday} / ${usage.requestLimit} today`}
            style={{
              background: `conic-gradient(rgb(99,102,241) ${Math.min((usage.requestsToday / usage.requestLimit) * 360, 360)}deg, rgba(255,255,255,0.05) 0deg)`
            }}
          >
            <span className="w-6 h-6 rounded-full bg-[#0f0f17] flex items-center justify-center text-[9px]">
              {usage.requestsToday}
            </span>
          </div>
        </div>
      )}

      {/* Bottom section: user profile */}
      <div className="border-t border-white/5 p-3">
        {isCollapsed ? (
          <Link
            href="/dashboard/settings"
            title={usage?.user?.name || user?.name || "Settings"}
            className="flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all"
          >
            {usage?.user?.image || user?.image ? (
              <img
                src={usage?.user?.image || user?.image || ""}
                className="w-7 h-7 rounded-full object-cover border border-white/10"
                alt="Profile"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {(usage?.user?.name || user?.name)?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
          >
            {usage?.user?.image || user?.image ? (
              <img
                src={usage?.user?.image || user?.image || ""}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                alt="Profile Pic"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 group-hover:scale-105 transition-transform duration-300">
                {(usage?.user?.name || user?.name)?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate transition-colors group-hover:text-indigo-300">
                {usage?.user?.name || user?.name || "User"}
              </p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                {usage?.user?.email || user?.email || ""}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-all group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button — always visible on small screens */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/80 backdrop-blur border border-white/10 text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="lg:hidden fixed top-0 left-0 h-full w-64 z-50 bg-[#0f0f17] border-r border-white/5 shadow-2xl"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} isCollapsed={false} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar — collapsible with smooth animation */}
      <motion.div
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-[#0f0f17] border-r border-white/5 overflow-hidden shrink-0"
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <SidebarContent isCollapsed={collapsed} />
      </motion.div>
    </>
  );
}

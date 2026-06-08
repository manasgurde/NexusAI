"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useUsage } from "@/context/UsageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Activity, LogOut, Check, ArrowRight, Loader2,
  Sparkles, MessageSquare, Code2, FileText, Image, FileSearch,
  Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";



interface HistoryItem {
  id: string;
  toolId: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  createdAt: string;
}

type TabType = "profile" | "security" | "history" | "logout";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { usage, refreshUsage } = useUsage();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Form states
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Initialize values from UsageContext or Session
  useEffect(() => {
    if (usage?.user) {
      setName(usage.user.name || "");
      setAvatarUrl(usage.user.image || "");
    } else if (session?.user) {
      setName(session.user.name || "");
      setAvatarUrl(session.user.image || "");
    }
  }, [usage, session]);

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/history`, {
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setHistory(result.data || []);
      } else {
        toast.error(result.message || "Failed to load usage history");
      }
    } catch (error) {
      console.error("History fetch error:", error);
      toast.error("Failed to connect to backend server");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: avatarUrl }),
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Profile updated successfully!");
        await refreshUsage();
      } else {
        toast.error(result.message || "Failed to update profile details");
      }
    } catch (error) {
      toast.error("An error occurred. Check backend logs.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Password updated successfully!");
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.message || "Failed to update password");
      }
    } catch (error) {
      toast.error("An error occurred. Check backend logs.");
    } finally {
      setSavingPassword(false);
    }
  };

  const getToolIcon = (toolId: string) => {
    switch (toolId.toUpperCase()) {
      case "CHATBOT":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "CODE_REVIEWER":
      case "CODE_REVIEW":
        return <Code2 className="w-4 h-4 text-violet-400" />;
      case "CONTENT_GENERATOR":
      case "CONTENT_GEN":
        return <FileText className="w-4 h-4 text-pink-400" />;
      case "NOTE_SUMMARIZER":
      case "NOTE_SUMMARIZE":
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case "IMAGE_GENERATOR":
      case "IMAGE_GEN":
        return <Image className="w-4 h-4 text-green-400" />;
      default:
        return <FileSearch className="w-4 h-4 text-teal-400" />;
    }
  };

  const getToolLabel = (toolId: string) => {
    switch (toolId.toUpperCase()) {
      case "CHATBOT":
        return "AI Chatbot";
      case "CODE_REVIEWER":
      case "CODE_REVIEW":
        return "Code Reviewer";
      case "CONTENT_GENERATOR":
      case "CONTENT_GEN":
        return "Content Generator";
      case "NOTE_SUMMARIZER":
      case "NOTE_SUMMARIZE":
        return "Note Summarizer";
      case "IMAGE_GENERATOR":
      case "IMAGE_GEN":
        return "Image Generator";
      default:
        return "Resume Analyzer";
    }
  };

  const tabs = [
    { id: "profile", label: "Profile Settings", icon: User },
    { id: "security", label: "Account Security", icon: Shield },
    { id: "history", label: "Usage History", icon: Activity },
    { id: "logout", label: "Sign Out", icon: LogOut },
  ];

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-6xl mx-auto overflow-hidden">
      {/* Tech Grid Pattern & Ambient Light */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-10">
        {/* Page Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Account Management
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Workspace Settings
          </h1>
          <p className="mt-2 text-gray-400 text-sm max-w-xl leading-relaxed">
            Manage your personal profile details, change security configurations, view complete tool execution history, and control sessions.
          </p>
        </div>

        {/* Settings Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left Navigation Tabs */}
          <div className="flex flex-col gap-2 md:col-span-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isSelected
                      ? "bg-indigo-500/15 border border-indigo-500/20 text-indigo-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-gray-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Forms Content Panel */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md"
                >
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">Profile Details</h3>
                    <p className="text-xs text-gray-500 mt-1">Configure your personal public-facing credentials and workspace avatar.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter display name"
                        className="w-full px-4 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors"
                      />
                    </div>

                    {/* Email Field (Disabled) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                        <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">System Lock</span>
                      </div>
                      <input
                        type="email"
                        value={usage?.user?.email || session?.user?.email || ""}
                        disabled
                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Profile Picture Uploader */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Profile Photo</label>
                      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md">
                        {/* Current avatar preview */}
                        <div className="relative group shrink-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              className="w-20 h-20 rounded-full object-cover border border-white/10 shadow-lg"
                              alt="Avatar Preview"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white border border-white/10 shadow-lg">
                              {name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                          )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                          <p className="text-xs text-gray-300 font-medium">Upload a custom image from your device</p>
                          <p className="text-[10px] text-gray-500">Supports PNG, JPG, or WEBP up to 2MB</p>
                          
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                              Browse Files
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  if (!file.type.startsWith("image/")) {
                                    toast.error("Only image files are supported");
                                    return;
                                  }

                                  if (file.size > 2 * 1024 * 1024) {
                                    toast.error("Avatar image must be under 2MB");
                                    return;
                                  }

                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setAvatarUrl(base64);
                                    toast.info("New avatar selected. Click 'Save Profile Changes' below to apply.");
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            
                            {avatarUrl && (
                              <button
                                type="button"
                                onClick={() => setAvatarUrl("")}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-500/10 text-xs font-bold text-red-400 hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
                              >
                                Remove Image
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          Save Profile Changes <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md"
                >
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">Account Security</h3>
                    <p className="text-xs text-gray-500 mt-1">Update your login security password credentials.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    {/* New Password */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter new password (min. 6 characters)"
                          className="w-full pl-4 pr-10 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-4 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors"
                      />
                    </div>

                    {/* Submit Password Button */}
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                        </>
                      ) : (
                        <>
                          Update Password <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md"
                >
                  <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">Usage History</h3>
                      <p className="text-xs text-gray-500 mt-1">Review a log of recent AI operations completed in your workspace.</p>
                    </div>
                    {loadingHistory && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                  </div>

                  {/* History Timeline */}
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {history.length === 0 && !loadingHistory ? (
                      <div className="text-center py-12 text-gray-600 text-sm">
                        No recent AI executions logged for this account.
                      </div>
                    ) : (
                      history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02] transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            {getToolIcon(item.toolId)}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-bold text-white">{getToolLabel(item.toolId)}</h4>
                              <span className="text-[10px] text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-[11px] text-gray-400 font-medium truncate">
                                <span className="text-gray-600 font-bold uppercase tracking-wider text-[9px] mr-1">Input:</span> 
                                {item.prompt}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                <span className="text-gray-600 font-bold uppercase tracking-wider text-[9px] mr-1">Result:</span> 
                                {item.response}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-semibold text-gray-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">
                                {item.tokensUsed} tokens logged
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "logout" && (
                <motion.div
                  key="logout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-red-500/10 bg-red-950/[0.02] p-6 lg:p-8 space-y-6 backdrop-blur-md"
                >
                  <div className="border-b border-red-500/10 pb-4">
                    <h3 className="text-lg font-bold text-red-400">Terminate Active Session</h3>
                    <p className="text-xs text-gray-500 mt-1">Log out of your active session on this device.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs leading-relaxed max-w-xl">
                    Logging out will immediately clear your active session token. You will need to input your email/password or use Google Sign-In again to access your workspace.
                  </div>

                  <div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/auth" })}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs hover:scale-[1.03] transition-all shadow-lg shadow-red-500/15"
                    >
                      <LogOut className="w-4 h-4" /> End Session & Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

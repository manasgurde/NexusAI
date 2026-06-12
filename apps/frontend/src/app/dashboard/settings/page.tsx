"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useUsage } from "@/context/UsageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, LogOut, Check, ArrowRight, Loader2,
  Sparkles, Eye, EyeOff, Bell, Trash2, AlertTriangle, HardDrive
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type TabType = "profile" | "security" | "storage" | "notifications" | "danger" | "logout";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { usage, refreshUsage } = useUsage();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile states
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Document storage states
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Notification states
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [usageAlerts, setUsageAlerts] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Account deletion states
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (usage?.user) {
      setName(usage.user.name || "");
      setAvatarUrl(usage.user.image || "");
    } else if (user) {
      setName(user.name || "");
      setAvatarUrl(user.image || "");
    }
  }, [usage, user]);

  useEffect(() => {
    if (activeTab === "storage") fetchFiles();
    if (activeTab === "notifications") fetchPreferences();
  }, [activeTab]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/files`, { credentials: "include" });
      if (res.status === 401) {
        toast.error("Session expired. Logging out...");
        await signOut({ callbackUrl: "/auth" });
        return;
      }
      const result = await res.json();
      if (res.ok && result.success) setFiles(result.data || []);
      else toast.error(result.message || "Failed to load files");
    } catch { toast.error("Failed to connect to backend server"); }
    finally { setLoadingFiles(false); }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/files/${fileId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.status === 401) {
        toast.error("Session expired. Logging out...");
        await signOut({ callbackUrl: "/auth" });
        return;
      }
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("File deleted successfully");
        setFiles(prev => prev.filter(f => f.id !== fileId));
        await refreshUsage();
      } else {
        toast.error(result.message || "Failed to delete file");
      }
    } catch {
      toast.error("Failed to delete file due to network error");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const fetchPreferences = async () => {
    setLoadingPrefs(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/preferences`, { credentials: "include" });
      const result = await res.json();
      if (res.ok && result.success) {
        setBillingAlerts(result.data.billingAlerts ?? true);
        setUsageAlerts(result.data.usageAlerts ?? true);
      }
    } catch { toast.error("Failed to load notification preferences"); }
    finally { setLoadingPrefs(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingProfile(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: avatarUrl }),
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) { toast.success("Profile updated successfully!"); await refreshUsage(); }
      else toast.error(result.message || "Failed to update profile details");
    } catch { toast.error("An error occurred. Check backend logs."); }
    finally { setSavingProfile(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters long"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) { toast.success("Password updated successfully!"); setPassword(""); setConfirmPassword(""); }
      else toast.error(result.message || "Failed to update password");
    } catch { toast.error("An error occurred. Check backend logs."); }
    finally { setSavingPassword(false); }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingAlerts, usageAlerts }),
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) toast.success("Notification preferences saved!");
      else toast.error(result.message || "Failed to save preferences");
    } catch { toast.error("Failed to connect to backend server"); }
    finally { setSavingPrefs(false); }
  };

  const handleDeleteAccount = async () => {
    const userEmail = usage?.user?.email || user?.email || "";
    if (deleteEmail !== userEmail) { toast.error("Email address does not match"); return; }
    setDeletingAccount(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/profile`, {
        method: "DELETE",
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Account permanently deleted");
        await signOut({ callbackUrl: "/auth" });
      } else { toast.error(result.message || "Failed to delete account"); }
    } catch { toast.error("Failed to connect to backend server"); }
    finally { setDeletingAccount(false); }
  };

  const tabs = [
    { id: "profile", label: "Profile Settings", icon: User },
    { id: "security", label: "Account Security", icon: Shield },
    { id: "storage", label: "Document Storage", icon: HardDrive },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "danger", label: "Delete Account", icon: Trash2, danger: true },
    { id: "logout", label: "Sign Out", icon: LogOut, danger: true },
  ];

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-6xl mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-10">
        {/* Page Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Account Management
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">Workspace Settings</h1>
          <p className="mt-2 text-gray-400 text-sm max-w-xl leading-relaxed">
            Manage your profile, security, document storage, notification preferences, and account lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left Navigation */}
          <div className="flex flex-col gap-1.5 md:col-span-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isSelected
                      ? tab.danger
                        ? "bg-red-500/10 border border-red-500/20 text-red-300"
                        : "bg-indigo-500/15 border border-indigo-500/20 text-indigo-300"
                      : tab.danger
                        ? "text-red-500/60 hover:text-red-400 hover:bg-red-500/5 border border-transparent"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isSelected ? (tab.danger ? "text-red-400" : "text-indigo-400") : tab.danger ? "text-red-500/40" : "text-gray-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Content Panel */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {/* === PROFILE TAB === */}
              {activeTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">Profile Details</h3>
                    <p className="text-xs text-gray-500 mt-1">Configure your personal credentials and workspace avatar.</p>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Name</label>
                      <input id="settings-name-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter display name"
                        className="w-full px-4 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                        <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">System Lock</span>
                      </div>
                      <input type="email" value={usage?.user?.email || user?.email || ""} disabled
                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Profile Photo</label>
                      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md">
                        <div className="relative group shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} className="w-20 h-20 rounded-full object-cover border border-white/10 shadow-lg" alt="Avatar Preview" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white border border-white/10 shadow-lg">
                              {name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                          <p className="text-xs text-gray-300 font-medium">Upload a custom image from your device</p>
                          <p className="text-[10px] text-gray-500">Supports PNG, JPG, or WEBP up to 2MB</p>
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                              Browse Files
                              <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (!file.type.startsWith("image/")) { toast.error("Only image files are supported"); return; }
                                  if (file.size > 2 * 1024 * 1024) { toast.error("Avatar image must be under 2MB"); return; }
                                  const reader = new FileReader();
                                  reader.onload = (event) => { setAvatarUrl(event.target?.result as string); toast.info("New avatar selected. Click 'Save Profile Changes' to apply."); };
                                  reader.readAsDataURL(file);
                                }} />
                            </label>
                            {avatarUrl && (
                              <button type="button" onClick={() => setAvatarUrl("")}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-500/10 text-xs font-bold text-red-400 hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/5 transition-all">
                                Remove Image
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button id="settings-save-profile" type="submit" disabled={savingProfile}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-wait">
                      {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Save Profile Changes <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* === SECURITY TAB === */}
              {activeTab === "security" && (
                <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">Account Security</h3>
                    <p className="text-xs text-gray-500 mt-1">Update your login security password credentials.</p>
                  </div>
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter new password (min. 6 characters)"
                          className="w-full pl-4 pr-10 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-400">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                      <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-4 py-3 bg-black/40 border border-white/8 focus:border-indigo-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors" />
                    </div>
                    <button type="submit" disabled={savingPassword}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-wait">
                      {savingPassword ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* === DOCUMENT STORAGE TAB === */}
              {activeTab === "storage" && (
                <motion.div key="storage" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">Document Storage</h3>
                      <p className="text-xs text-gray-500 mt-1">Manage files uploaded to notes, summaries, and resume analytics.</p>
                    </div>
                    {loadingFiles && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                  </div>

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {files.length === 0 && !loadingFiles ? (
                      <div className="text-center py-12 text-gray-600 text-sm">
                        No files uploaded yet. Upload documents in Summarizer or Resume Analyzer tools to see them here.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-400">
                              <th className="p-4">File Name</th>
                              <th className="p-4">Type</th>
                              <th className="p-4">Size</th>
                              <th className="p-4">Uploaded</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                            {files.map((file) => (
                              <tr key={file.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 font-medium text-white max-w-[200px] truncate" title={file.fileName}>
                                  {file.fileName}
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-gray-400 uppercase font-semibold">
                                    {file.mimeType.split("/")[1] || file.mimeType}
                                  </span>
                                </td>
                                <td className="p-4 font-mono">{formatFileSize(file.fileSize)}</td>
                                <td className="p-4 text-gray-500">
                                  {new Date(file.createdAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-2 rounded-lg border border-red-500/10 text-red-400 hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* === NOTIFICATIONS TAB === */}
              {activeTab === "notifications" && (
                <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">Notification Preferences</h3>
                    <p className="text-xs text-gray-500 mt-1">Control which email alerts you receive from NexusAI.</p>
                  </div>

                  {loadingPrefs ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                  ) : (
                    <div className="space-y-4">
                      {/* Billing Alerts Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">Billing Alerts</p>
                          <p className="text-[11px] text-gray-500">Email notifications for subscription renewals, payment failures, and plan changes.</p>
                        </div>
                        <button id="settings-billing-toggle" onClick={() => setBillingAlerts(!billingAlerts)}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${billingAlerts ? "bg-indigo-500" : "bg-white/10"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${billingAlerts ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>

                      {/* Usage Alerts Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">Usage Alerts</p>
                          <p className="text-[11px] text-gray-500">Email warnings when you approach (80%) or hit your daily AI request quota.</p>
                        </div>
                        <button id="settings-usage-toggle" onClick={() => setUsageAlerts(!usageAlerts)}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${usageAlerts ? "bg-indigo-500" : "bg-white/10"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${usageAlerts ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>

                      <button id="settings-save-prefs" onClick={handleSavePreferences} disabled={savingPrefs}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 disabled:cursor-wait">
                        {savingPrefs ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Preferences</>}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* === DANGER ZONE TAB === */}
              {activeTab === "danger" && (
                <motion.div key="danger" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-red-500/10 bg-red-950/[0.02] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-red-500/10 pb-4">
                    <h3 className="text-lg font-bold text-red-400">Delete Account</h3>
                    <p className="text-xs text-gray-500 mt-1">Permanently remove your account, all AI history, uploaded files, and billing records.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                    <p className="text-xs text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> This action is irreversible</p>
                    <ul className="text-xs text-gray-500 space-y-1 pl-6 list-disc">
                      <li>All AI history and generated content will be permanently deleted</li>
                      <li>All uploaded files will be removed from Cloudinary storage</li>
                      <li>Organization memberships will be terminated</li>
                      <li>Your subscription will be cancelled immediately</li>
                    </ul>
                  </div>

                  {!showDeleteConfirm ? (
                    <button id="settings-delete-account-btn" onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 hover:border-red-500/30 font-bold text-xs transition-all">
                      <Trash2 className="w-4 h-4" /> Delete My Account
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                          Type your email <span className="text-gray-400 normal-case font-normal">({usage?.user?.email || user?.email})</span> to confirm
                        </label>
                        <input id="settings-delete-email-input" type="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-black/40 border border-red-500/20 focus:border-red-500/40 focus:outline-none rounded-xl text-sm text-gray-200 transition-colors" />
                      </div>
                      <div className="flex gap-3">
                        <button id="settings-confirm-delete" onClick={handleDeleteAccount} disabled={deletingAccount}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs hover:scale-[1.03] transition-all disabled:opacity-50 shadow-lg shadow-red-500/15">
                          {deletingAccount ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Permanently Delete</>}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(""); }}
                          className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-bold text-xs transition-all">
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* === LOGOUT TAB === */}
              {activeTab === "logout" && (
                <motion.div key="logout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-red-500/10 bg-red-950/[0.02] p-6 lg:p-8 space-y-6 backdrop-blur-md">
                  <div className="border-b border-red-500/10 pb-4">
                    <h3 className="text-lg font-bold text-red-400">Terminate Active Session</h3>
                    <p className="text-xs text-gray-500 mt-1">Log out of your active session on this device.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs leading-relaxed max-w-xl">
                    Logging out will immediately clear your active session token. You will need to input your email/password or use Google Sign-In again to access your workspace.
                  </div>
                  <button id="settings-logout-btn" onClick={() => signOut({ callbackUrl: "/auth" })}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs hover:scale-[1.03] transition-all shadow-lg shadow-red-500/15">
                    <LogOut className="w-4 h-4" /> End Session & Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

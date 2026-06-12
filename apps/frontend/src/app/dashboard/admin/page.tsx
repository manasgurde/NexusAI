"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUsage } from "@/context/UsageContext";
import { motion } from "framer-motion";
import {
  ShieldAlert, Users, TrendingUp, Cpu, CreditCard, Search, Loader2,
  Lock, Unlock, ArrowLeft, ArrowRight, UserCheck, ShieldClose
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function AdminPage() {
  const { usage } = useUsage();
  const isAdmin = usage?.user?.role === "ADMIN";

  const [mounted, setMounted] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // User table state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/analytics`, {
        method: "GET",
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setStats(result.data);
      }
    } catch (e) {
      console.error("Failed to load admin stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "8",
        search: searchText,
        plan: planFilter
      });

      const res = await fetch(`${BACKEND_URL}/api/v1/admin/users?${queryParams}`, {
        method: "GET",
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setUsers(result.data.users || []);
        setTotalPages(result.data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error("Failed to load users list:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [page, planFilter, isAdmin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBanToggle = async (userId: string, isCurrentlyBanned: boolean) => {
    setActionUserId(userId);
    try {
      const endpoint = isCurrentlyBanned ? "unban" : "ban";
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}/${endpoint}`, {
        method: "POST",
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "User status updated successfully!");
        await fetchUsers();
        await fetchStats();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status.");
    } finally {
      setActionUserId(null);
    }
  };

  if (!mounted) return null;

  // 403 Lockout UI for non-admin accounts
  if (!isAdmin) {
    return (
      <div className="relative min-h-screen bg-[#030014] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full p-8 rounded-3xl border border-rose-500/20 bg-rose-950/[0.04] backdrop-blur-xl text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Access Denied</h1>
            <p className="text-gray-400 text-xs leading-relaxed">
              Administrators only. You do not possess the administrative privileges required to view the operations panel.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all hover:scale-[1.02]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-6xl mx-auto overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-10">
        {/* Page Header */}
        <div className="border-b border-white/5 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Admin Console
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Operations Panel
          </h1>
          <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
            Monitor real-time revenue collection, token usage volumes, and moderate platform customer accounts.
          </p>
        </div>

        {/* Loading overlay for stats */}
        {loadingStats ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          stats && (
            <>
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Users */}
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md flex items-center gap-4 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Users</p>
                    <h3 className="text-2xl text-white font-black mt-0.5">{stats.kpis?.totalUsers || 0}</h3>
                  </div>
                </div>

                {/* Card 2: MRR */}
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md flex items-center gap-4 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">MRR (Past 30 Days)</p>
                    <h3 className="text-sm text-white font-black mt-0.5">
                      ${stats.kpis?.mrr?.USD?.toFixed(2)} · ₹{stats.kpis?.mrr?.INR?.toFixed(2)}
                    </h3>
                  </div>
                </div>

                {/* Card 3: AI Requests Today */}
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md flex items-center gap-4 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">AI Queries Today</p>
                    <h3 className="text-2xl text-white font-black mt-0.5">{stats.kpis?.requestsToday || 0}</h3>
                  </div>
                </div>

                {/* Card 4: Active Subs */}
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md flex items-center gap-4 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pro Accounts Active</p>
                    <h3 className="text-2xl text-white font-black mt-0.5">
                      {Object.entries(stats.kpis?.activePlans || {})
                        .filter(([k]) => k !== "FREE")
                        .reduce((acc, [, v]: any) => acc + v, 0)}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Aggregation Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4 shadow-lg backdrop-blur-md">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">30-Day Collection Trends</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.charts?.revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#ffffff03" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#666" fontSize={9} />
                        <YAxis stroke="#666" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f0f1c", borderColor: "#ffffff05", color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Line type="monotone" dataKey="USD" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 4 }} name="USD ($)" />
                        <Line type="monotone" dataKey="INR" stroke="#10b981" strokeWidth={2} activeDot={{ r: 4 }} name="INR (₹)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Requests Usage Chart */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4 shadow-lg backdrop-blur-md">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">30-Day AI Request Volume</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.charts?.usage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#ffffff03" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#666" fontSize={9} />
                        <YAxis stroke="#666" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f0f1c", borderColor: "#ffffff05", color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Bar dataKey="CONTENT_GEN" fill="#3b82f6" name="Content" stackId="a" />
                        <Bar dataKey="CHATBOT" fill="#6366f1" name="Chat" stackId="a" />
                        <Bar dataKey="CODE_REVIEW" fill="#a855f7" name="Code" stackId="a" />
                        <Bar dataKey="NOTE_SUMMARIZER" fill="#ec4899" name="Notes" stackId="a" />
                        <Bar dataKey="IMAGE_GEN" fill="#f43f5e" name="Image" stackId="a" />
                        <Bar dataKey="RESUME_ANALYZER" fill="#f59e0b" name="Resume" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* User Moderation Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Account Moderation
              </h2>
              <p className="text-gray-500 text-xs">Search, filter, and restrict client accounts.</p>
            </div>

            {/* Search + Plan Filter */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9 pr-4 py-2.5 w-48 sm:w-56 text-xs rounded-xl bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/5 text-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE">Free</option>
                <option value="PRO_299">Starter Pro</option>
                <option value="PRO_599">Growth Pro</option>
                <option value="PRO_999">Elite Pro</option>
              </select>
            </form>
          </div>

          {/* Users List Table */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No user accounts match query parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-400">
                      <th className="p-4">User</th>
                      <th className="p-4">Workspace</th>
                      <th className="p-4">Active Plan</th>
                      <th className="p-4">Joined At</th>
                      <th className="p-4">Suspended</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {users.map((u) => {
                      const date = new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4">
                            <div className="font-medium text-white">{u.name || "N/A"}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{u.email}</div>
                          </td>
                          <td className="p-4 text-gray-400 font-medium">{u.workspaceName}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              u.plan === "FREE"
                                ? "bg-white/5 border-white/10 text-gray-500"
                                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                            }`}>
                              {u.plan.replace("PRO_", "Pro ")}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500">{date}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              u.isBanned
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            }`}>
                              {u.isBanned ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {actionUserId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-500 inline" />
                            ) : (
                              <button
                                onClick={() => handleBanToggle(u.id, u.isBanned)}
                                disabled={u.role === "ADMIN"}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider uppercase transition-all disabled:opacity-30 disabled:pointer-events-none hover:scale-[1.03] ${
                                  u.isBanned
                                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25"
                                    : "bg-rose-500/15 border-rose-500/20 text-rose-400 hover:bg-rose-500/25"
                                }`}
                              >
                                {u.isBanned ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    Unban
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    Ban
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User list pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-40 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-40 transition-colors"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

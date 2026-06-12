"use client";

import { useState, useEffect } from "react";
import { useUsage } from "@/context/UsageContext";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Copy, Check, Shield, UserCheck, Loader2, Sparkles, Mail, Link2
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function TeamPage() {
  const { usage } = useUsage();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Helper to read cookie values
  const getCookie = (name: string) => {
    try {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)"));
      if (match) return match[2];
    } catch (e) {}
    return null;
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const activeOrgId = getCookie("x-organization-id");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (activeOrgId) {
        headers["x-organization-id"] = activeOrgId;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/organizations/members`, {
        method: "GET",
        headers,
        credentials: "include"
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setMembers(result.data || []);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Failed to load members:", error);
      toast.error(error.message || "Failed to fetch workspace members.");
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [usage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteLink("");
    try {
      const activeOrgId = getCookie("x-organization-id");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (activeOrgId) {
        headers["x-organization-id"] = activeOrgId;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/organizations/invite`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail }),
        credentials: "include"
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Invitation sent successfully!");
        setInviteLink(result.url || "");
        setInviteEmail("");
      } else {
        throw new Error(result.message || "Failed to dispatch invitation.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during invitation.");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-5xl mx-auto overflow-hidden">
      {/* Tech Grid Pattern & Ambient Light */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Collaboration
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Team Space
            </h1>
            <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
              Invite team members to collaborate in your active workspace. All members share the workspace's Pro subscription limits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Member list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Workspace Members
              </h2>
              <p className="text-gray-500 text-xs">Current members belonging to this workspace.</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden">
              {loadingMembers ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No members found in this organization.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-400">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Joined At</th>
                        <th className="p-4">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                      {members.map((m) => {
                        const date = new Date(m.joinedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        });
                        const isOwner = m.role === "OWNER";

                        return (
                          <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-medium flex items-center gap-2">
                              {m.user?.image ? (
                                <img
                                  src={m.user.image}
                                  className="w-6 h-6 rounded-full object-cover border border-white/10"
                                  alt=""
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                  {(m.user?.name || m.user?.email)?.[0]?.toUpperCase() ?? "U"}
                                </div>
                              )}
                              <span className="text-white">{m.user?.name || "Pending User"}</span>
                            </td>
                            <td className="p-4 font-mono text-gray-400">{m.user?.email || "N/A"}</td>
                            <td className="p-4 text-gray-500">{date}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isOwner
                                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                  : "bg-white/5 border-white/10 text-gray-400"
                              }`}>
                                {isOwner ? (
                                  <>
                                    <Shield className="w-3 h-3 shrink-0" />
                                    Owner
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3 shrink-0" />
                                    Member
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Invite card */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Invite Members
              </h2>
              <p className="text-gray-500 text-xs">Send signed workspace tokens to add members.</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md p-6 space-y-6">
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviting}
                    className="w-full px-4 py-3 text-xs rounded-xl bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98] text-white shadow-lg shadow-indigo-500/15 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Invite...
                    </>
                  ) : (
                    <>
                      Send Invitation
                      <UserPlus className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Share link container */}
              {inviteLink && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3"
                >
                  <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Direct Share Link</span>
                    <span>Copy Link</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] font-mono text-gray-400 truncate flex-1">{inviteLink}</span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

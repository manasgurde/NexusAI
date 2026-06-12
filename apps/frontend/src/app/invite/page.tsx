"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function InviteRedemptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your team invitation...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token was provided.");
      return;
    }

    const redeemInvite = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/organizations/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token }),
          credentials: "include"
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus("success");
          setMessage(result.message || "Successfully joined the organization!");
          toast.success("Joined organization successfully!");
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          throw new Error(result.message || "Failed to join organization.");
        }
      } catch (err: any) {
        console.error("Invite error:", err);
        setStatus("error");
        setMessage(err.message || "Failed to verify invitation. It may have expired.");
        toast.error(err.message || "Failed to redeem invitation.");
      }
    };

    redeemInvite();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
      {status === "loading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-gray-300 text-sm font-medium">{message}</p>
        </motion.div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to the Team!</h2>
          <p className="text-gray-400 text-xs leading-relaxed">{message}</p>
          <p className="text-gray-500 text-[10px] animate-pulse">Redirecting to dashboard...</p>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Invalid Invitation</h2>
          <p className="text-gray-400 text-xs leading-relaxed">{message}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white transition-all"
          >
            Go to Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="relative min-h-screen bg-[#030014] flex items-center justify-center overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-lg p-8 rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-xl shadow-2xl mx-4">
        <Suspense fallback={
          <div className="flex flex-col items-center space-y-4 py-10">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-gray-400 text-xs">Loading invitation verification...</p>
          </div>
        }>
          <InviteRedemptionContent />
        </Suspense>
      </div>
    </div>
  );
}

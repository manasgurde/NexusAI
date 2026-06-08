"use client";

import { useState } from "react";
import { useUsage } from "@/context/UsageContext";
import { motion } from "framer-motion";
import { Check, Zap, Sparkles, Shield, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const PLANS = [
  {
    id: "FREE",
    name: "Free Plan",
    price: "₹0",
    period: "forever",
    description: "Perfect for exploring NexusAI features and testing the waters.",
    features: [
      "10 AI requests per day",
      "Access to 4 core AI tools",
      "Standard generation speeds",
      "Community support",
    ],
    color: "from-gray-500 to-slate-600",
    glow: "shadow-slate-500/5",
  },
  {
    id: "PRO_299",
    name: "Starter Pro",
    price: "₹299",
    period: "month",
    description: "Great for regular developers and creators needing higher volume.",
    features: [
      "50 AI requests per day",
      "Access to all 6 AI tools",
      "Fast response streaming",
      "Standard document summaries",
      "Email support",
    ],
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/10",
    popular: true,
  },
  {
    id: "PRO_599",
    name: "Growth Pro",
    price: "₹599",
    period: "month",
    description: "Ideal for power users who require substantial daily bandwidth.",
    features: [
      "120 AI requests per day",
      "Access to all 6 AI tools",
      "Priority streaming speeds",
      "Large file/PDF summaries (RAG)",
      "Priority email support",
    ],
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/10",
  },
  {
    id: "PRO_999",
    name: "Elite Pro",
    price: "₹999",
    period: "month",
    description: "For professionals who need maximum AI superpowers daily.",
    features: [
      "300 AI requests per day",
      "Access to all 6 AI tools",
      "Max priority processing",
      "Unlimited history logging",
      "Dedicated account manager",
      "Early access to new models",
    ],
    color: "from-pink-500 to-rose-600",
    glow: "shadow-pink-500/15",
  },
];

export default function BillingPage() {
  const { usage, refreshUsage } = useUsage();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const activePlan = usage?.plan || "FREE";

  const handleSubscribe = async (planId: string) => {
    if (activePlan === planId) {
      toast.info("You are already subscribed to this plan.");
      return;
    }

    setSubmitting(planId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/dashboard/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update subscription");
      }

      toast.success(result.message || "Subscription updated successfully!");
      await refreshUsage();
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "An error occurred during subscription update.");
    } finally {
      setSubmitting(null);
    }
  };

  const getPlanHeaderGlow = (planId: string) => {
    switch (planId) {
      case "PRO_299":
        return "bg-blue-500/10 border-blue-500/20";
      case "PRO_599":
        return "bg-purple-500/10 border-purple-500/20";
      case "PRO_999":
        return "bg-rose-500/10 border-rose-500/20";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-10 max-w-6xl mx-auto overflow-hidden">
      {/* Tech Grid Pattern & Ambient Light */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Pricing Tiers
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Choose Your AI Quota
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Upgrade your plan instantly to increase your daily request limits and unlock advanced features. Simple flat pricing.
          </p>
        </div>

        {/* Grid of pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const isActive = activePlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative flex flex-col rounded-2xl border transition-all duration-500 bg-white/[0.01] shadow-xl overflow-hidden ${
                  isActive 
                    ? "border-indigo-500 bg-indigo-950/[0.08] shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)]" 
                    : "border-white/5 hover:border-white/15 hover:bg-white/[0.03] hover:-translate-y-1 hover:shadow-2xl"
                }`}
              >
                {/* Decorative colored strip on top */}
                <div className={`h-[4px] w-full bg-gradient-to-r ${plan.color}`} />

                {plan.popular && (
                  <span className="absolute top-3 right-3 text-[8px] font-black tracking-widest uppercase bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2.5 py-1 rounded-full shadow-lg">
                    Popular
                  </span>
                )}

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-white text-lg">{plan.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed min-h-[48px]">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline text-white">
                    <span className="text-3.5xl font-black tracking-tight">{plan.price}</span>
                    <span className="ml-1 text-xs text-gray-500">/{plan.period}</span>
                  </div>

                  {/* Upgrade trigger button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={submitting !== null || isActive}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all duration-300 ${
                      isActive
                        ? "bg-white/5 text-gray-400 cursor-not-allowed border border-white/5"
                        : submitting === plan.id
                        ? "bg-indigo-600/50 text-white cursor-wait"
                        : `bg-gradient-to-r ${plan.color} text-white shadow-md hover:scale-[1.03] hover:shadow-lg hover:shadow-indigo-500/10`
                    }`}
                  >
                    {submitting === plan.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Activating...
                      </>
                    ) : isActive ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        Active Plan
                      </>
                    ) : (
                      <>
                        Upgrade Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Features Checklist */}
                  <div className="space-y-4 pt-3 border-t border-white/5">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Features Included</div>
                    <ul className="space-y-3">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
                          <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 flex flex-col md:flex-row gap-5 items-center justify-between backdrop-blur-md"
        >
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              Simulated Billing Integration Active
            </h4>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              No real credit card is required. Toggling plans updates your limits immediately in the database and creates mock payment logs. Stripe and Razorpay gateway integrations will be activated in Phase 5.
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Billing cycle resets monthly · Cancel anytime
          </div>
        </motion.div>
      </div>
    </div>
  );
}

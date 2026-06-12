"use client";

import { useState, useEffect, Suspense } from "react";
import { useUsage } from "@/context/UsageContext";
import { motion } from "framer-motion";
import { Check, Zap, Sparkles, Shield, ArrowRight, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/utils/apiFetch";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const PLANS = [
  {
    id: "FREE",
    name: "Free Plan",
    price: { USD: "$0", INR: "₹0" },
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
    price: { USD: "$3.99", INR: "₹299" },
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
    price: { USD: "$7.99", INR: "₹599" },
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
    price: { USD: "$12.99", INR: "₹999" },
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

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function BillingPageContent() {
  const { usage, refreshUsage } = useUsage();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const activePlan = usage?.plan || "FREE";
  const searchParams = useSearchParams();

  // Auto-detect currency
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Kolkata" || tz.startsWith("Asia/India") || navigator.language === "en-IN") {
        setCurrency("INR");
      }
    } catch (e) {}
  }, []);

  // Fetch history
  const fetchHistory = async () => {
    try {
      const response = await apiFetch("/api/v1/dashboard/billing-history", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setHistory(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch billing history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [usage]);

  // Handle URL redirect query params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const mockCheckoutSuccess = searchParams.get("mock_checkout_success");
    const plan = searchParams.get("plan");

    if (success === "true") {
      toast.success("Subscription upgraded successfully! Welcome to Pro.");
      window.history.replaceState({}, "", "/dashboard/billing");
      refreshUsage();
    } else if (canceled === "true") {
      toast.error("Checkout was canceled.");
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (mockCheckoutSuccess === "true" && plan) {
      const completeMockStripe = async () => {
        try {
          const res = await apiFetch("/api/v1/dashboard/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan })
          });
          const result = await res.json();
          if (res.ok) {
            toast.success("Mock Stripe Subscription activated successfully!");
          } else {
            throw new Error(result.message);
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to activate mock subscription.");
        } finally {
          window.history.replaceState({}, "", "/dashboard/billing");
          refreshUsage();
        }
      };
      completeMockStripe();
    }
  }, [searchParams]);

  const handleSubscribe = async (planId: string) => {
    if (activePlan === planId) {
      toast.info("You are already subscribed to this plan.");
      return;
    }

    setSubmitting(planId);
    try {
      if (currency === "USD") {
        // Stripe flow
        const response = await apiFetch("/api/v1/payments/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to create Stripe checkout session");
        }

        if (result.url) {
          window.location.href = result.url;
        }
      } else {
        // Razorpay flow
        const response = await apiFetch("/api/v1/payments/razorpay/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to initialize Razorpay checkout");
        }

        if (result.mock) {
          // Direct mock verification callback
          const verifyResponse = await apiFetch("/api/v1/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: `rzp_pay_mock_${Date.now()}`,
              razorpay_subscription_id: result.subscriptionId,
              razorpay_signature: "mock_signature",
              plan: result.plan,
              organizationId: result.organizationId,
            }),
          });
          const verifyResult = await verifyResponse.json();
          if (!verifyResponse.ok) throw new Error(verifyResult.message || "Failed to verify mock payment");
          toast.success("Mock Subscription activated!");
          await refreshUsage();
        } else {
          // Real Razorpay subscription flow
          const resLoaded = await loadRazorpayScript();
          if (!resLoaded) {
            toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
            return;
          }
          const options = {
            key: result.keyId,
            subscription_id: result.subscriptionId,
            name: "NexusAI",
            description: `Subscribe to ${planId}`,
            handler: async function (resCallback: any) {
              try {
                setSubmitting(planId);
                const verifyResponse = await apiFetch("/api/v1/payments/razorpay/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_payment_id: resCallback.razorpay_payment_id,
                    razorpay_subscription_id: resCallback.razorpay_subscription_id,
                    razorpay_signature: resCallback.razorpay_signature,
                    plan: planId
                  }),
                });
                const verifyResult = await verifyResponse.json();
                if (!verifyResponse.ok) throw new Error(verifyResult.message || "Verification failed");
                toast.success("Subscription activated successfully!");
                await refreshUsage();
              } catch (err: any) {
                toast.error(err.message || "Payment verification failed.");
              } finally {
                setSubmitting(null);
              }
            },
            prefill: {
              name: usage?.user?.name || "",
              email: usage?.user?.email || "",
            },
            theme: {
              color: "#6366f1",
            },
          };
          const paymentObject = new (window as any).Razorpay(options);
          paymentObject.open();
        }
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "An error occurred during checkout setup.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await apiFetch("/api/v1/payments/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response.ok && result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.message || "Could not find active Stripe customer portal link");
      }
    } catch (err: any) {
      toast.error(err.message || "Only Stripe subscriptions can be self-managed via Stripe Portal.");
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

        {/* Currency Switcher */}
        <div className="flex justify-center items-center gap-3">
          <span className={`text-xs ${currency === "USD" ? "text-white font-bold" : "text-gray-500 font-medium"}`}>USD ($)</span>
          <button
            onClick={() => setCurrency(prev => prev === "USD" ? "INR" : "USD")}
            className="relative w-11 h-6 bg-white/10 hover:bg-white/15 rounded-full transition-colors duration-300 focus:outline-none border border-white/5"
          >
            <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-indigo-500 rounded-full transition-transform duration-300 ${currency === "INR" ? "transform translate-x-5" : ""}`} />
          </button>
          <span className={`text-xs ${currency === "INR" ? "text-white font-bold" : "text-gray-500 font-medium"}`}>INR (₹)</span>
        </div>

        {/* Active Plan Detail & Stripe Customer Portal */}
        {activePlan !== "FREE" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto p-5 rounded-2xl bg-white/[0.02] border border-indigo-500/20 backdrop-blur-md flex justify-between items-center shadow-lg gap-4"
          >
            <div className="space-y-1">
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Current Active Plan</p>
              <h3 className="text-lg text-white font-black">
                {activePlan === "PRO_299" ? "Starter Pro" : activePlan === "PRO_599" ? "Growth Pro" : "Elite Pro"}
              </h3>
              {usage?.currentPeriodEnd && (
                <p className="text-[10px] text-gray-500 font-medium">Renews on {new Date(usage.currentPeriodEnd).toLocaleDateString()}</p>
              )}
            </div>
            <button
              onClick={handleManageBilling}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-all hover:scale-[1.02]"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              Manage Subscription
            </button>
          </motion.div>
        )}

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
                    <span className="text-3.5xl font-black tracking-tight">{plan.price[currency]}</span>
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
                        ? "bg-indigo-600/50 text-white cursor-wait border border-indigo-500/20"
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
              Secure Checkout Systems Active
            </h4>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              We process subscription upgrades securely via Stripe (USD payments) and Razorpay (INR payments). Toggling currency automatically routes your subscription request through the appropriate gateway.
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Billing resets monthly · Cancel anytime
          </div>
        </motion.div>

        {/* Billing History Section */}
        <div className="relative z-10 space-y-6 pt-10 border-t border-white/5">
          <div className="space-y-1">
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Billing History
            </h2>
            <p className="text-gray-400 text-xs">
              View your invoices and past subscription transactions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden">
            {loadingHistory ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No payment history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-400">
                      <th className="p-4">Date</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Provider</th>
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {history.map((pay) => {
                      const date = new Date(pay.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });
                      const amountFormatted = pay.currency === "INR"
                        ? `₹${(pay.amount / 100).toFixed(2)}`
                        : `$${(pay.amount / 100).toFixed(2)}`;

                      return (
                        <tr key={pay.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 font-medium">{date}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-white font-semibold">
                              {pay.subscription?.plan || "PRO"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-white">{amountFormatted}</td>
                          <td className="p-4 uppercase tracking-wider text-[10px] font-semibold text-gray-400">{pay.provider}</td>
                          <td className="p-4 font-mono text-gray-500 max-w-[120px] truncate">{pay.transactionId || "N/A"}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              pay.status === "SUCCESS"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : pay.status === "PENDING"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}>
                              {pay.status}
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
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}

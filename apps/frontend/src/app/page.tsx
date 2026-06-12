"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Sparkles, ArrowRight, Check, ChevronDown, Code2, FileText,
  MessageSquare, Image, FileSearch, BookOpen, Zap, Shield,
  Globe, Menu, X, Star
} from "lucide-react";

// ─── DATA ──────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    icon: FileText,
    color: "from-pink-500 to-rose-600",
    glow: "pink",
    title: "Content Generator",
    desc: "Craft blog posts, ad copy, emails, and social content in seconds — tailored to your brand voice.",
    badge: "Most Popular"
  },
  {
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-600",
    glow: "blue",
    title: "AI Chatbot",
    desc: "Persistent, context-aware conversational AI. Chat sessions remember your history and preferences.",
    badge: null
  },
  {
    icon: Code2,
    color: "from-violet-500 to-purple-700",
    glow: "violet",
    title: "Code Reviewer",
    desc: "Paste any code and receive structured feedback on bugs, security vulnerabilities, and best practices.",
    badge: "Dev Favorite"
  },
  {
    icon: BookOpen,
    color: "from-amber-500 to-orange-600",
    glow: "amber",
    title: "Note Summarizer",
    desc: "Transform lengthy meeting notes, PDFs, and documents into concise, actionable summaries.",
    badge: null
  },
  {
    icon: Image,
    color: "from-emerald-500 to-teal-600",
    glow: "emerald",
    title: "Image Generator",
    desc: "Generate stunning AI visuals from text prompts. Perfect for design assets, social media, and mockups.",
    badge: "New"
  },
  {
    icon: FileSearch,
    color: "from-teal-500 to-cyan-700",
    glow: "teal",
    title: "Resume Analyzer",
    desc: "Upload your CV and get scored feedback aligned to any job description with ATS optimization tips.",
    badge: null
  },
];

const PLANS = [
  {
    name: "Free",
    priceUSD: "$0",
    priceINR: "₹0",
    period: "forever",
    features: ["10 AI requests/day", "All 6 AI tools", "Basic history log", "Community support"],
    cta: "Start Free",
    href: "/auth",
    highlight: false
  },
  {
    name: "Starter",
    priceUSD: "$3.99",
    priceINR: "₹299",
    period: "/month",
    features: ["50 AI requests/day", "All 6 AI tools", "Full history log", "API keys access", "Email alerts", "Priority support"],
    cta: "Get Starter",
    href: "/auth",
    highlight: false
  },
  {
    name: "Growth",
    priceUSD: "$7.99",
    priceINR: "₹599",
    period: "/month",
    features: ["120 AI requests/day", "All 6 AI tools", "Team collaboration", "Organization workspace", "Admin analytics", "Email priority support"],
    cta: "Get Growth",
    href: "/auth",
    highlight: true
  },
  {
    name: "Scale",
    priceUSD: "$12.99",
    priceINR: "₹999",
    period: "/month",
    features: ["300 AI requests/day", "All 6 AI tools", "Unlimited team size", "Advanced analytics", "Custom integrations", "Dedicated support"],
    cta: "Get Scale",
    href: "/auth",
    highlight: false
  },
];

const FAQS = [
  { q: "What AI model powers NexusAI?", a: "All NexusAI tools are powered exclusively by Google's Gemini API — one of the most advanced language and multimodal models available, with gemini-1.5-pro for complex reasoning and gemini-1.5-flash for speed." },
  { q: "Can I use all 6 tools on the free tier?", a: "Yes! Every plan including the free tier gives you full access to all 6 AI tools. The only difference is the daily request limit — free users get 10 requests per day." },
  { q: "Do you support team collaboration?", a: "Yes. Growth and Scale plans include organization workspaces where you can invite team members, share a shared quota pool, and collaborate under a single subscription." },
  { q: "What payment methods are accepted?", a: "NexusAI accepts international cards via Stripe (USD) and UPI, net banking, and Indian debit/credit cards via Razorpay (INR). Both payment methods are available at checkout." },
  { q: "Is there a refund policy?", a: "We offer a 7-day refund window for all paid plans if you're not satisfied with the service. Contact our support team with your order ID to initiate a refund." },
  { q: "How are API keys secured?", a: "API keys are hashed using SHA-256 before storage — we never store your plaintext key. Keys are displayed only once on creation and cannot be recovered — only revoked and regenerated." },
];

// ─── HERO GLOWING ORBS ────────────────────────────────────────────────────────

function HeroOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-purple-500/8 blur-[80px]" />
      <div className="absolute top-[30%] right-[5%] w-[350px] h-[350px] rounded-full bg-blue-500/8 blur-[90px]" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-600/6 blur-[100px]" />
    </div>
  );
}

// ─── FLOATING TOOL CARDS ──────────────────────────────────────────────────────

function FloatingCard({ tool, delay, className }: { tool: typeof TOOLS[0], delay: number, className: string }) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: 0.6 } }}
      className={`absolute ${className} hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md`}
    >
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-white">{tool.title}</p>
        <p className="text-[9px] text-gray-400">Powered by Gemini</p>
      </div>
    </motion.div>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border border-white/5 rounded-xl overflow-hidden"
    >
      <button
        id={`faq-item-${index}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-indigo-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/5 bg-[#030014]/90 backdrop-blur-xl" : ""}`}>
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">NexusAI</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "FAQ"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">{item}</a>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth" id="nav-login-btn"
              className="text-sm font-semibold text-gray-300 hover:text-white transition-colors px-4 py-2">
              Log In
            </Link>
            <Link href="/auth" id="nav-getstarted-btn"
              className="flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button id="nav-mobile-menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="md:hidden border-t border-white/5 bg-[#030014]/95 backdrop-blur-xl px-6 py-4 space-y-3">
              {["Features", "Pricing", "FAQ"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-gray-300 hover:text-white transition-colors py-2">{item}</a>
              ))}
              <Link href="/auth" className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm mt-2">
                Get Started Free
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        <HeroOrbs />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        {/* Floating tool cards */}
        <FloatingCard tool={TOOLS[0]} delay={0.8} className="top-[28%] left-[4%]" />
        <FloatingCard tool={TOOLS[2]} delay={1.0} className="top-[40%] right-[4%]" />
        <FloatingCard tool={TOOLS[4]} delay={1.2} className="bottom-[25%] left-[6%]" />
        <FloatingCard tool={TOOLS[5]} delay={1.4} className="bottom-[30%] right-[6%]" />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Powered by Google Gemini API &nbsp;·&nbsp; All 6 tools in one platform
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
            <span className="bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent">
              One Platform.<br />
            </span>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Six AI Superpowers.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            NexusAI gives developers, creators, and teams access to 6 specialized AI tools — from code review to image generation — under a single, affordable subscription.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth" id="hero-cta-primary"
              className="group relative flex items-center gap-2 justify-center px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:scale-105 transition-all shadow-2xl shadow-indigo-500/25">
              <Zap className="w-4 h-4" />
              Start for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity" />
            </Link>
            <a href="#features" id="hero-cta-secondary"
              className="flex items-center gap-2 justify-center px-8 py-4 rounded-2xl border border-white/10 text-gray-300 font-semibold text-sm hover:border-white/20 hover:bg-white/5 transition-all">
              Explore Features <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-8 pt-4">
            {[
              { num: "6", label: "AI Tools" },
              { num: "∞", label: "Possibilities" },
              { num: "₹0", label: "To Start" },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{num}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold">
              <Sparkles className="w-3 h-3" /> AI Tool Suite
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-extrabold tracking-tight">
              Everything you need,<br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">in one dashboard</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-gray-400 text-lg max-w-2xl mx-auto">
              Stop juggling multiple AI subscriptions. Access all your creative and technical tools in a single, unified workspace.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.div key={tool.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 p-6 transition-all duration-300 cursor-default"
                >
                  {/* Glow on hover */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${tool.color} blur-2xl -z-10`} style={{ opacity: 0 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.04"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }} />

                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {tool.badge && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300">{tool.badge}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{tool.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{tool.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 space-y-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-bold">
              <Globe className="w-3 h-3" /> Plans for Everyone
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-extrabold tracking-tight">
              Transparent pricing,<br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">no surprises</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-gray-400 max-w-xl mx-auto">
              Available in USD (Stripe) and INR (Razorpay). Annual plans save up to 20%.
            </motion.p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm font-semibold ${billing === "monthly" ? "text-white" : "text-gray-500"}`}>Monthly</span>
              <button id="pricing-billing-toggle" onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${billing === "yearly" ? "bg-indigo-500" : "bg-white/10"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${billing === "yearly" ? "left-6" : "left-0.5"}`} />
              </button>
              <span className={`text-sm font-semibold ${billing === "yearly" ? "text-white" : "text-gray-500"}`}>
                Yearly <span className="text-emerald-400 text-[10px] font-bold ml-0.5">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? "border border-indigo-500/30 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 shadow-xl shadow-indigo-500/10"
                    : "border border-white/5 bg-white/[0.02]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold shadow-lg shadow-indigo-500/20">
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-extrabold text-white">{plan.priceINR}</span>
                    <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{plan.priceUSD} USD{plan.period !== "forever" ? plan.period : ""}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-gray-300">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} id={`pricing-cta-${plan.name.toLowerCase()}`}
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5"
                  }`}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-gray-500 font-medium">
            {[
              { icon: Shield, label: "Secure Payments via Stripe & Razorpay" },
              { icon: Zap, label: "Instant activation after payment" },
              { icon: Check, label: "7-day money-back guarantee" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-bold">
              <MessageSquare className="w-3 h-3" /> FAQ
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl font-extrabold tracking-tight">
              Got questions?<br />
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">We've got answers.</span>
            </motion.h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/10 blur-[80px] rounded-full" />
            <div className="relative z-10 space-y-6">
              <p className="text-4xl font-extrabold tracking-tight">
                Ready to unlock your<br />
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI superpowers?</span>
              </p>
              <p className="text-gray-400 max-w-lg mx-auto">Start for free today. No credit card required. Access all 6 AI tools instantly.</p>
              <Link href="/auth" id="footer-cta-btn"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:scale-105 transition-all shadow-2xl shadow-indigo-500/20">
                <Zap className="w-4 h-4" /> Get Started — It's Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">NexusAI</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
              <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-gray-300 transition-colors">FAQ</a>
              <Link href="/auth" className="hover:text-gray-300 transition-colors">Dashboard</Link>
            </div>
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} NexusAI. Powered by Google Gemini.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

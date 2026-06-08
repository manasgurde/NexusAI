"use client";

import { motion } from "framer-motion";
import { Image, Sparkles } from "lucide-react";

export default function ImageGenPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white/[0.02] border border-white/5 rounded-2xl p-8 lg:p-10 flex flex-col items-center shadow-xl shadow-green-500/5"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
          <Image className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Image Generator</h1>
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full mb-6 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Coming in Phase 3
        </div>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Soon you'll be able to create stunning high-resolution images, illustrations, and art directly from text descriptions, powered by Imagen models.
        </p>
        <div className="w-full h-px bg-white/5 mb-6" />
        <span className="text-xs text-gray-600">
          Stripe & Razorpay payment integration will unlock premium usage.
        </span>
      </motion.div>
    </div>
  );
}

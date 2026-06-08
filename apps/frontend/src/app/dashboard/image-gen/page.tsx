"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { useUsage } from "@/context/UsageContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const STYLE_PRESETS = [
  { id: "photorealistic", name: "Realistic", description: "Photorealistic & 8k raw photo detail", preview: "📷" },
  { id: "anime", name: "Anime", description: "Vibrant anime drawing & illustration", preview: "🌸" },
  { id: "cyberpunk", name: "Cyberpunk", description: "Glowing neon lights & futuristic cityscapes", preview: "🧬" },
  { id: "digital-art", name: "Digital Art", description: "Concept art & fantasy illustrations", preview: "🎨" },
  { id: "oil-painting", name: "Oil Painting", description: "Visible brush strokes & classical art texture", preview: "🖼️" },
  { id: "cinematic", name: "Cinematic", description: "Atmospheric depth & dramatic movie still", preview: "🎬" },
];

const ASPECT_RATIOS = [
  { id: "1:1", name: "1:1 Square", desc: "1024 x 1024 px" },
  { id: "16:9", name: "16:9 Widescreen", desc: "1024 x 576 px" },
  { id: "9:16", name: "9:16 Vertical", desc: "576 x 1024 px" },
  { id: "4:3", name: "4:3 Standard", desc: "1024 x 768 px" },
];

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { refreshUsage } = useUsage();

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/image-gen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stylePreset,
          aspectRatio,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate image.");
      }

      if (data.success && data.image) {
        setGeneratedImage(data.image);
      } else {
        throw new Error("No image was returned from the server.");
      }
    } catch (err: any) {
      console.error("Image gen error:", err);
      setError(err.message || "An unexpected error occurred while generating the image.");
    } finally {
      setGenerating(false);
      refreshUsage();
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `nexusai-${Date.now()}.webp`;
    a.click();
  };

  const handleCopy = () => {
    if (!generatedImage) return;
    navigator.clipboard.writeText(generatedImage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Image Generator</h1>
            <p className="text-xs text-gray-500">Powered by Pollinations AI</p>
          </div>
        </div>
        {generatedImage && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all bg-white/[0.01]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied Base64!" : "Copy URL"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all bg-white/[0.01]"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
          {/* Left Column: Inputs */}
          <div className="flex flex-col gap-6">
            {/* Prompt Card */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-400" />
                Describe your image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic cybernetic garden under neon rain, bioluminescent mushrooms, hyperrealistic 8k details..."
                className="w-full min-h-[120px] px-4 py-3 bg-black/40 border border-white/8 focus:border-green-500/40 focus:outline-none rounded-xl text-sm text-gray-200 placeholder-gray-700 resize-none transition-colors"
                disabled={generating}
              />
            </div>

            {/* Style Presets Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Style Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setStylePreset(style.id)}
                    disabled={generating}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      stylePreset === style.id
                        ? "border-green-500 bg-green-500/5 shadow-md shadow-green-500/5"
                        : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-xl mb-1.5">{style.preview}</span>
                    <span className="text-xs font-bold text-white mb-0.5">{style.name}</span>
                    <span className="text-[10px] text-gray-500 leading-normal line-clamp-1">{style.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Choose Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    disabled={generating}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      aspectRatio === ratio.id
                        ? "border-green-500 bg-green-500/5 shadow-md shadow-green-500/5"
                        : "border-white/5 bg-white/[0.01] hover:border-white/10"
                    }`}
                  >
                    <div className={`border rounded flex items-center justify-center shrink-0 border-gray-600 ${
                      ratio.id === "1:1" ? "w-6 h-6" :
                      ratio.id === "16:9" ? "w-7 h-4" :
                      ratio.id === "9:16" ? "w-4 h-7" : "w-6 h-4.5"
                    }`} />
                    <div>
                      <p className="text-xs font-bold text-white">{ratio.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{ratio.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Trigger */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Generating Image...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Create Artwork
                </>
              )}
            </button>
          </div>

          {/* Right Column: Output Preview */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold text-white">Artwork Preview</label>
            
            <div className="flex-1 min-h-[400px] border border-white/8 rounded-2xl bg-black/20 overflow-hidden flex flex-col items-center justify-center relative p-4">
              <AnimatePresence mode="wait">
                {/* 1. Empty state */}
                {!generatedImage && !generating && !error && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center max-w-xs"
                  >
                    <ImageIcon className="w-12 h-12 text-gray-800 mb-4" />
                    <p className="text-gray-500 text-sm font-medium">
                      Enter a detailed text prompt on the left and click Create Artwork to generate your image
                    </p>
                  </motion.div>
                )}

                {/* 2. Generating loading skeleton */}
                {generating && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-3 overflow-hidden shadow-inner"
                  >
                    {/* Glowing effect inside loader */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <RefreshCw className="w-8 h-8 text-green-400 animate-spin" />
                    <p className="text-xs text-gray-400">Brushing canvas pixels...</p>
                  </motion.div>
                )}

                {/* 3. Error state */}
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center max-w-xs gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-medium leading-relaxed">
                      {error}
                    </p>
                    <button
                      onClick={handleGenerate}
                      className="text-[10px] text-gray-400 hover:text-white border border-white/10 bg-white/5 px-2 py-1 rounded-md mt-1 transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}

                {/* 4. Generated image */}
                {generatedImage && !generating && (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-[480px]">
                      <img
                        src={generatedImage}
                        alt="AI Generated Artwork"
                        className="max-w-full max-h-[480px] object-contain"
                      />
                      {/* Overlay action trigger */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={handleDownload}
                          className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform hover:scale-105"
                          title="Download Image"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCopy}
                          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shadow-lg transition-transform hover:scale-105 border border-white/10"
                          title="Copy Base64 URL"
                        >
                          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

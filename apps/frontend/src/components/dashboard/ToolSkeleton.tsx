"use client";

import React from "react";

// Shimmer animation base class via inline style (no Tailwind @keyframes needed)
const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
  backgroundSize: "400% 100%",
  animation: "nexus-shimmer 1.6s ease-in-out infinite",
};

// Inline keyframe injection — only runs once per page
if (typeof document !== "undefined") {
  const styleId = "nexus-shimmer-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes nexus-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ ...shimmerStyle, ...style }}
    />
  );
}

// ─────────────────────────────────────────────
// Chat tool skeleton (Chatbot)
// ─────────────────────────────────────────────
export function ChatbotSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar history panel */}
      <div className="hidden md:flex flex-col w-64 border-r border-white/5 p-4 gap-3">
        <SkeletonBlock className="h-8 w-3/4 mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12" />
        ))}
      </div>
      {/* Main chat area */}
      <div className="flex flex-col flex-1 p-6 gap-4">
        <SkeletonBlock className="h-10 w-56 mb-2" />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
              <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
              <SkeletonBlock className={`h-16 ${i % 2 === 1 ? "w-2/5" : "w-3/5"}`} />
            </div>
          ))}
        </div>
        {/* Input bar */}
        <SkeletonBlock className="h-14 w-full mt-auto" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Two-panel (code/text input + output) skeleton
// Used by: Code Reviewer, Content Generator, Note Summarizer
// ─────────────────────────────────────────────
export function TwoPanelSkeleton({ title }: { title?: string }) {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-9 w-72" />
        <SkeletonBlock className="h-4 w-96" />
      </div>
      {/* Controls row */}
      <div className="flex gap-3 flex-wrap">
        <SkeletonBlock className="h-10 w-36" />
        <SkeletonBlock className="h-10 w-28" />
        <SkeletonBlock className="h-10 w-28" />
      </div>
      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonBlock className="h-72 lg:h-96" />
        <SkeletonBlock className="h-72 lg:h-96" />
      </div>
      {/* Action button */}
      <SkeletonBlock className="h-12 w-48" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Image generator skeleton
// ─────────────────────────────────────────────
export function ImageGenSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-9 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      {/* Style presets */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      {/* Prompt input */}
      <SkeletonBlock className="h-28 w-full" />
      {/* Aspect ratio row */}
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-32" />
        ))}
      </div>
      {/* Generate button */}
      <SkeletonBlock className="h-14 w-56" />
      {/* Image canvas placeholder */}
      <SkeletonBlock className="h-80 w-full rounded-2xl" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Resume analyzer skeleton
// ─────────────────────────────────────────────
export function ResumeSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-9 w-72" />
        <SkeletonBlock className="h-4 w-96" />
      </div>
      {/* Upload zone */}
      <SkeletonBlock className="h-44 w-full rounded-2xl" />
      {/* Job description textarea */}
      <SkeletonBlock className="h-36 w-full" />
      {/* Analyze button */}
      <SkeletonBlock className="h-12 w-48" />
      {/* Result cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Generic / fallback skeleton (for settings, billing, etc.)
// ─────────────────────────────────────────────
export function GenericToolSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-9 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <SkeletonBlock className="h-64 w-full" />
      <SkeletonBlock className="h-48 w-full" />
      <SkeletonBlock className="h-12 w-44" />
    </div>
  );
}

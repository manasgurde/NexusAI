"use client";

import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextTopLoader
        color="#6366f1"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={false}
        easing="ease"
        speed={200}
        shadow="0 0 10px #6366f1, 0 0 5px #6366f1"
      />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#13111c",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e8f0",
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}

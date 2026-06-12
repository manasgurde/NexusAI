"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface UsageData {
  plan: string;
  requestsToday: number;
  requestLimit: number;
  currentPeriodEnd: string | null;
  user?: {
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
  } | null;
}

interface UsageContextType {
  usage: UsageData | null;
  loading: boolean;
  refreshUsage: () => Promise<void>;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/usage`, {
        credentials: "include", // propagate NextAuth cookies
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setUsage(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch usage statistics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return (
    <UsageContext.Provider value={{ usage, loading, refreshUsage }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error("useUsage must be used within a UsageProvider");
  }
  return context;
}

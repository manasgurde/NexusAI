"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { UsageProvider } from "@/context/UsageContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UsageProvider>
      <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </UsageProvider>
  );
}

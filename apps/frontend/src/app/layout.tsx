import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NexusAI — Full Stack AI SaaS Platform",
  description: "Access specialized AI tools for Content Generation, Chat, Code Review, Note Summaries, Image Generation, and Resume Analysis in one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-dominant text-white antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

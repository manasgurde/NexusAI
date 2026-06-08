"use client";

import { useState, useRef, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface UseStreamReturn {
  text: string;
  loading: boolean;
  error: string | null;
  start: (body: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useStream(
  endpoint: string,
  options?: { onSuccess?: () => void; onMetadata?: (metadata: any) => void }
): UseStreamReturn {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (body: Record<string, unknown>) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setText("");

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include", // For cookie auth in cross-origin environments
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body from server");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setText((prev) => prev + parsed.text);
            if (parsed.sessionId && options?.onMetadata) {
              options.onMetadata(parsed);
            }
          } catch (parseErr: any) {
            if (parseErr.message !== "Unexpected token") {
              throw parseErr;
            }
          }
        }
      }

      // Stream completed successfully
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setText("");
    setError(null);
    setLoading(false);
  }, []);

  return { text, loading, error, start, stop, reset };
}

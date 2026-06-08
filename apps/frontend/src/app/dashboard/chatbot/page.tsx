"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, RotateCcw, Bot, User, StopCircle, Sparkles,
  History, Trash2, Loader2
} from "lucide-react";
import { useStream } from "@/hooks/useStream";
import { useUsage } from "@/context/UsageContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Explain quantum computing in simple terms",
  "Write a Python function to sort a list of dictionaries",
  "What are the best practices for REST API design?",
  "Summarize the key differences between SQL and NoSQL",
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  
  // Chat History thread states
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { refreshUsage } = useUsage();

  const fetchSessions = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ai/chatbot/sessions`, {
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSessions(result.data || []);
      }
    } catch (e) {
      console.error("Failed to load chat sessions:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const { text, loading, error, start, stop, reset } = useStream("/api/v1/ai/chatbot", {
    onSuccess: () => {
      refreshUsage();
      fetchSessions();
    },
    onMetadata: (metadata) => {
      if (metadata.sessionId) {
        setActiveSessionId(metadata.sessionId);
      }
    }
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = loading;

  // Add streaming assistant message to history when done
  useEffect(() => {
    if (!loading && text) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", content: text }];
        }
        return [...prev, { role: "assistant", content: text }];
      });
      reset();
    }
  }, [loading]); // eslint-disable-line

  // Keep streaming response visible as last message
  const displayMessages: Message[] = isStreaming && text
    ? [...messages, { role: "assistant", content: text }]
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, text]);

  // Load chat sessions list on toggle
  useEffect(() => {
    if (showHistory) {
      fetchSessions();
    }
  }, [showHistory, fetchSessions]);

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ai/chatbot/sessions/${id}`, {
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setMessages(result.data.messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })));
        setActiveSessionId(id);
        setShowHistory(false);
        reset();
        toast.success(`Loaded conversation: "${result.data.title}"`);
      } else {
        toast.error(result.message || "Failed to load chat history");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to server");
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click from loading session
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ai/chatbot/sessions/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSessionId === id) {
          newChat();
        }
        toast.success("Chat conversation deleted");
      } else {
        toast.error(result.message || "Failed to delete conversation");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error");
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    await start({
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      sessionId: activeSessionId
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newChat = () => {
    stop();
    setMessages([]);
    setActiveSessionId(null);
    reset();
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Chatbot</h1>
            <p className="text-xs text-gray-500">Powered by Gemini Flash</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* History Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border transition-all ${
              showHistory ? "bg-indigo-500/15 border-indigo-500/20 text-indigo-300" : "hover:bg-white/5 border-white/5"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>

          <button
            onClick={newChat}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Main Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {displayMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center pb-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">How can I help you?</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm">
              Ask me anything — I can help with coding, writing, analysis, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-xs text-gray-400 hover:text-white px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400 mb-1" />
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {displayMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    msg.role === "user"
                      ? "bg-indigo-500"
                      : "bg-gradient-to-tr from-blue-500 to-cyan-500"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-500/20 border border-indigo-500/30 text-white rounded-tr-md"
                      : "bg-white/[0.05] border border-white/5 text-gray-200 rounded-tl-md"
                  }`}
                >
                  {msg.content}
                  {isStreaming && i === displayMessages.length - 1 && msg.role === "assistant" && (
                    <span className="inline-block w-1 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {error && (
          <div className="text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur z-10">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeSessionId ? "Reply in conversation..." : "Message NexusAI... (Shift+Enter for new line)"}
              rows={1}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 hover:border-white/15 focus:border-indigo-500/50 focus:outline-none rounded-xl text-sm text-white placeholder-gray-600 resize-none transition-colors"
              style={{ maxHeight: "160px", overflowY: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 160) + "px";
              }}
            />
          </div>
          <button
            onClick={isStreaming ? stop : handleSend}
            disabled={!isStreaming && !input.trim()}
            className={`px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shrink-0 ${
              isStreaming
                ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {isStreaming ? (
              <>
                <StopCircle className="w-4 h-4" /> Stop
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sliding History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/60 z-20"
            />

            {/* History Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute top-0 right-0 w-80 h-full border-l border-white/5 bg-[#0a0a0f] z-30 flex flex-col shadow-2xl"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  Chat History (10 Days)
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5 border border-white/10"
                >
                  Close
                </button>
              </div>

              {/* Sidebar Session List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-xs text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    Loading history...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-20 text-xs text-gray-500">
                    No conversations in the last 10 days.
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group text-left ${
                          isActive
                            ? "bg-indigo-500/10 border-indigo-500/35 text-white"
                            : "bg-white/[0.01] hover:bg-white/[0.04] border-white/5 hover:border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {session.title || "Untitled Chat"}
                          </p>
                          <p className="text-[9px] text-gray-500 mt-1">
                            {new Date(session.updatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

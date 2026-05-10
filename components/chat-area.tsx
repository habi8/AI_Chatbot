"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatAreaProps {
  userId: string;
  sessionId?: string;
  shellMessage?: string | null;
}

export default function ChatArea({
  userId,
  sessionId,
  shellMessage,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  const fetchMessages = useCallback(async () => {
    if (!sessionId || !supabase) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("[v0] Failed to fetch messages:", error);
      setSendError("Could not load messages for this chat.");
    }
  }, [sessionId, supabase]);

  // Fetch messages
  useEffect(() => {
    if (!sessionId || !supabase) return;

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, sessionId, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !sessionId || !supabase) return;

    const userMessage = inputValue;
    setInputValue("");
    setIsLoading(true);
    setSendError(null);

    const optimisticUserMessage: Message = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((currentMessages) => [
      ...currentMessages,
      optimisticUserMessage,
    ]);

    try {
      // Update session title if it's the first message
      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .single();

      if (sessionData?.title === "New Chat") {
        const title = userMessage.substring(0, 50);
        await supabase
          .from("chat_sessions")
          .update({ title })
          .eq("id", sessionId);
      }

      // Send message to API
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.error || "Failed to send message");
      }

      if (responseData?.message) {
        const optimisticAssistantMessage: Message = {
          id: `pending-assistant-${Date.now()}`,
          role: "assistant",
          content: responseData.message,
          created_at: new Date().toISOString(),
        };
        setMessages((currentMessages) => [
          ...currentMessages.filter(
            (message) => message.id !== optimisticUserMessage.id,
          ),
          optimisticUserMessage,
          optimisticAssistantMessage,
        ]);
      }

      await fetchMessages();
    } catch (error) {
      console.error("[v0] Failed to send message:", error);
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => message.id !== optimisticUserMessage.id,
        ),
      );
      setSendError(
        error instanceof Error ? error.message : "Failed to send message",
      );
      setInputValue(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("[v0] Copy failed:", error);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-black">
        <p className="text-gray-400">
          {shellMessage || "Preparing a new chat..."}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up relative flex min-w-0 flex-1 flex-col bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.18),transparent_34rem)]" />
      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto px-4 pb-36 pt-8">
        {messages.length === 0 && !isLoading ? (
          <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
            <div className="px-8 py-6 text-center">
              <p className="font-mono text-lg text-gray-200">
                Start a conversation
              </p>
              <p className="mt-2 text-sm text-gray-500">A new chat is ready.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.24)] ${
                    msg.role === "user"
                      ? "bg-gray-700/90 text-white"
                      : "border border-gray-700/70 bg-gray-900/70 text-gray-100 backdrop-blur-xl"
                  }`}
                >
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>

                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="mt-2 p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-300" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-700/70 bg-gray-900/70 px-4 py-3 text-gray-100 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-10">
        <div className="mx-auto max-w-3xl">
          {sendError && (
            <div className="pointer-events-auto mb-3 rounded-lg border border-red-900/70 bg-red-950/70 px-3 py-2 text-sm text-red-200 shadow-lg backdrop-blur-xl">
              {sendError}
            </div>
          )}
          <form
            onSubmit={handleSendMessage}
            className="pointer-events-auto flex gap-2 rounded-2xl border border-gray-500/45 bg-gray-900/75 p-2 shadow-[0_0_24px_rgba(156,163,175,0.12),0_18px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-gray-400/60 hover:shadow-[0_0_34px_rgba(156,163,175,0.18),0_18px_70px_rgba(0,0,0,0.45)] focus-within:border-gray-300/70 focus-within:shadow-[0_0_44px_rgba(156,163,175,0.24),0_18px_70px_rgba(0,0,0,0.45)]"
          >
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message ChatBot..."
              disabled={isLoading}
              className="h-12 flex-1 border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-12 w-12 rounded-xl bg-gray-700 p-0 text-white hover:bg-gray-600 disabled:opacity-50"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

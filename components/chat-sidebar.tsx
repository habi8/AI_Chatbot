"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  userId,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          setLoadError(error.message);
          setSessions([]);
          return;
        }

        setLoadError(null);
        setSessions(data || []);
      } catch (error) {
        setLoadError("Failed to fetch sessions");
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();

    // Subscribe to real-time updates for chat_sessions
    const channel = supabase
      .channel(`chat_sessions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSessions((currentSessions) => [
              payload.new as ChatSession,
              ...currentSessions,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setSessions((currentSessions) =>
              currentSessions.map((session) =>
                session.id === (payload.new as ChatSession).id
                  ? (payload.new as ChatSession)
                  : session,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setSessions((currentSessions) =>
              currentSessions.filter(
                (session) => session.id !== (payload.old as ChatSession).id,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const handleNewChat = async () => {
    if (!supabase) return;

    const existingEmptyChat = sessions.find(
      (session) => session.title === "New Chat",
    );

    if (existingEmptyChat) {
      router.push(`/chat/${existingEmptyChat.id}`);
      return;
    }

    try {
      const { data: existingData, error: existingError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("title", "New Chat")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingData) {
        setSessions((currentSessions) =>
          currentSessions.some((session) => session.id === existingData.id)
            ? currentSessions
            : [existingData, ...currentSessions],
        );
        router.push(`/chat/${existingData.id}`);
        return;
      }

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          title: "New Chat",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSessions([data, ...sessions]);
        router.push(`/chat/${data.id}`);
      }
    } catch (error) {
      console.error("[v0] Failed to create session:", error);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setPendingDeleteId(null);
    router.push(`/chat/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!supabase) return;

    const previousSessions = sessions;
    setSessions((currentSessions) =>
      currentSessions.filter((session) => session.id !== sessionId),
    );

    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId);

      if (error) throw error;

      if (pathname === `/chat/${sessionId}`) {
        router.replace("/chat");
      }
      setPendingDeleteId(null);
    } catch (error) {
      console.error("[v0] Failed to delete session:", error);
      setSessions(previousSessions);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("[v0] Logout failed:", error);
    }
  };

  return (
    <div
      className={`relative z-20 flex flex-col border-r border-gray-700 bg-gray-900/90 backdrop-blur-xl transition-[width] duration-300 ${
        isOpen ? "w-72" : "w-16"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-700 p-3">
        {isOpen && (
          <h1 className="text-lg font-semibold text-white">1822_Bot</h1>
        )}
        <Button
          type="button"
          onClick={onToggle}
          className="h-10 w-10 bg-gray-800 p-0 text-white hover:bg-gray-700"
          title={isOpen ? "Collapse sidebar" : "Open sidebar"}
        >
          {isOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="border-b border-gray-700 p-3">
        <Button
          onClick={handleNewChat}
          className={`bg-gray-700 text-white hover:bg-gray-600 ${
            isOpen
              ? "flex w-full items-center justify-center gap-2"
              : "h-10 w-10 p-0"
          }`}
          title="New chat"
        >
          <Plus className="h-4 w-4" />
          {isOpen && "New Chat"}
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {!isOpen ? (
          <div className="p-2 text-center text-xs text-gray-500">
            {sessions.length}
          </div>
        ) : isLoading ? (
          <div className="p-4 text-gray-400 text-sm">Loading...</div>
        ) : loadError ? (
          <div className="p-4 text-red-400 text-sm">{loadError}</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">No chats yet</div>
        ) : (
          <div className="divide-y divide-gray-800/90 p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group py-1 text-gray-300 transition-colors first:pt-0 last:pb-0 ${
                  pendingDeleteId === session.id ? "bg-gray-800" : ""
                }`}
              >
                <div className="flex items-center gap-1 rounded-lg transition-colors hover:bg-gray-700">
                  <button
                    onClick={() => handleSelectSession(session.id)}
                    className="min-w-0 flex-1 truncate p-3 text-left text-sm"
                    title={session.title}
                  >
                    {session.title}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      pendingDeleteId === session.id
                        ? handleDeleteSession(session.id)
                        : setPendingDeleteId(session.id)
                    }
                    className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 opacity-0 transition hover:bg-red-950/60 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                    title={
                      pendingDeleteId === session.id
                        ? "Are you sure you want to delete this chat?"
                        : "Delete chat"
                    }
                  >
                    {pendingDeleteId === session.id ? (
                      <span className="text-xs font-semibold text-red-300">
                        OK
                      </span>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {pendingDeleteId === session.id && (
                  <div className="px-3 pb-3 text-xs text-red-300">
                    Are you sure you want to delete?
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="border-t border-gray-700 p-3">
        <Button
          onClick={handleLogout}
          className={`bg-gray-700 text-white hover:bg-gray-600 ${
            isOpen
              ? "flex w-full items-center justify-center gap-2"
              : "h-10 w-10 p-0"
          }`}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          {isOpen && "Logout"}
        </Button>
      </div>
    </div>
  );
}

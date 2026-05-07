"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  userId: string;
}

export default function ChatSidebar({ userId }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(
      supabaseUrl,
      supabaseAnonKey
    );
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
  }, [userId, supabase]);

  const handleNewChat = async () => {
    if (!supabase) return;

    try {
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
    router.push(`/chat/${sessionId}`);
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
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-white font-semibold text-lg">ChatBot</h1>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-700">
        <Button
          onClick={handleNewChat}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-gray-400 text-sm">Loading...</div>
        ) : loadError ? (
          <div className="p-4 text-red-400 text-sm">{loadError}</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">No chats yet</div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-300 text-sm truncate transition-colors"
              >
                {session.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <Button
          onClick={handleLogout}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import ChatSidebar from "@/components/chat-sidebar";
import ChatArea from "@/components/chat-area";

export default function ChatShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shellMessage, setShellMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hasCreatedInitialChat = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    const loadSession = async () => {
      if (!supabase) {
        setShellMessage("Supabase is not configured. Check your environment variables.");
        setIsLoading(false);
        return;
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        setShellMessage("No active session. Redirecting to login...");
        router.replace("/");
      } else {
        setShellMessage(null);
        setSession(currentSession);
      }

      setIsLoading(false);
    };

    loadSession();
  }, [supabase, router]);

  useEffect(() => {
    const createInitialChat = async () => {
      if (!session || !supabase || pathname !== "/chat" || hasCreatedInitialChat.current) {
        return;
      }

      hasCreatedInitialChat.current = true;
      setShellMessage("Preparing a new chat...");

      const { data: existingEmptyChat, error: existingError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("title", "New Chat")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error("[v0] Failed to find existing empty chat:", existingError);
      }

      if (existingEmptyChat) {
        router.replace(`/chat/${existingEmptyChat.id}`);
        return;
      }

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: session.user.id,
          title: "New Chat",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[v0] Failed to create initial chat:", error);
        setShellMessage(error.message || "Could not create a new chat.");
        hasCreatedInitialChat.current = false;
        return;
      }

      if (data) {
        router.replace(`/chat/${data.id}`);
      }
    };

    createInitialChat();
  }, [pathname, router, session, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-sm text-gray-400">
        Loading chat...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-black px-6 text-center text-sm text-gray-400">
        {shellMessage || "Redirecting to login..."}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <ChatSidebar
        userId={session.user.id}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((current) => !current)}
      />
      <ChatArea userId={session.user.id} shellMessage={shellMessage} />
    </div>
  );
}

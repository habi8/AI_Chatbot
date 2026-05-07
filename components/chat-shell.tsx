"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import ChatSidebar from "@/components/chat-sidebar";
import ChatArea from "@/components/chat-area";

export default function ChatShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    const loadSession = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        router.replace("/");
      } else {
        setSession(currentSession);
      }

      setIsLoading(false);
    };

    loadSession();
  }, [supabase, router]);

  if (isLoading) {
    return <div className="h-screen bg-black" />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-black">
      <ChatSidebar userId={session.user.id} />
      <ChatArea userId={session.user.id} />
    </div>
  );
}

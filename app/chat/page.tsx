import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import ChatSidebar from "@/components/chat-sidebar";
import ChatArea from "@/components/chat-area";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-black">
      <ChatSidebar userId={session.user.id} />
      <ChatArea userId={session.user.id} />
    </div>
  );
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { message, session_id } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from auth header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Save user message
    const { error: messageError } = await supabase.from("messages").insert({
      session_id,
      role: "user",
      content: message,
    });

    if (messageError) throw messageError;

    // Get conversation history
    const { data: messages, error: historyError } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (historyError) throw historyError;

    // Build context for Ollama
    const conversationHistory = messages?.map((m: any) => ({
      role: m.role,
      content: m.content,
    })) || [];

    // Call Ollama API
    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        messages: conversationHistory,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error("Ollama API error");
    }

    const ollamaData = await ollamaResponse.json();
    const assistantMessage = ollamaData.message?.content || "No response";

    // Save assistant message
    const { error: saveError } = await supabase.from("messages").insert({
      session_id,
      role: "assistant",
      content: assistantMessage,
    });

    if (saveError) throw saveError;

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("[v0] Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

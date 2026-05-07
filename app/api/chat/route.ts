import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

class UpstreamError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

async function readOllamaError(response: Response) {
  const text = await response.text();

  if (!text) {
    return `Ollama returned HTTP ${response.status}`;
  }

  try {
    const data = JSON.parse(text);
    return data.error || data.message || text;
  } catch {
    return text;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, session_id } = await request.json();
    if (!message || !session_id || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "deepseek-r1:1.5b";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
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

    const { data: sessionData, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
    let ollamaResponse: Response;
    try {
      ollamaResponse = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: conversationHistory,
          stream: false,
        }),
      });
    } catch (error) {
      throw new UpstreamError(
        `Could not connect to Ollama at ${ollamaBaseUrl}. Make sure Ollama is running.`
      );
    }

    if (!ollamaResponse.ok) {
      const ollamaError = await readOllamaError(ollamaResponse);
      throw new UpstreamError(`Ollama API error: ${ollamaError}`);
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

    if (error instanceof UpstreamError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

# AI Chatbot

A web-based AI chatbot with user authentication and persistent chat history, powered by a locally-running Qwen2.5 model.

**Built with:** Next.js · Supabase · Tailwind CSS · Ollama (Qwen2.5:7b)

---

## Features

- User sign up / login / logout
- Chat with DeepSeek AI model
- Multiple chat sessions
- Persistent chat history per user
- Minimal monochrome UI

---

## Run Locally

**Prerequisites:** Node.js v18+, Ollama installed, Supabase project created

**1. Clone and install**
```bash
git clone https://github.com/habi8/AI_Chatbot.git
cd AI_Chatbot
npm install
```

**2. Add environment variables** — create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OLLAMA_BASE_URL=http://localhost:11434
```

**3. Pull the model and start Ollama**
```bash
ollama pull qwen2.5:7b
ollama serve
```

**4. Start the app**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

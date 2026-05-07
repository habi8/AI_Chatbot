# Chatbot Setup Guide

This is a full-stack chatbot application built with Next.js, Supabase, and Ollama. Follow these steps to set it up.

## Prerequisites

- Node.js 18+
- Ollama running locally on `http://localhost:11434`
- Supabase project with credentials

## 1. Database Setup

Run the SQL setup script in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the entire content from `scripts/setup-db.sql`
4. Paste it and execute

This will create:
- `profiles` - User profile data
- `chat_sessions` - Chat session management
- `messages` - Chat messages with role (user/assistant)

## 2. Environment Variables

Your environment variables are already configured in the integration. The following are available:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

These are automatically set from your Supabase integration.

## 3. Ollama Setup

Make sure Ollama is running:

```bash
ollama serve
```

Pull the llama2 model if you haven't already:

```bash
ollama pull llama2
```

The API expects:
- Model: `llama2`
- Endpoint: `http://localhost:11434/api/chat`

## 4. Features

### Authentication Page (/)
- Email + Password signup/login
- Inline error messages
- Redirects to /chat on successful auth

### Chat Page (/chat)
- **Sidebar Features:**
  - App name at top
  - "New Chat" button
  - List of past sessions
  - Logout button

- **Main Chat Area:**
  - User messages right-aligned
  - AI messages left-aligned
  - Timestamps on hover
  - Copy button on AI messages
  - Typing indicator while waiting
  - Input box at bottom with send button
  - Auto-scroll to latest message
  - Enter key to send

## 5. Design

- **Color Palette:** Monochrome (black, white, grays)
- **Font:** JetBrains Mono (digital/monospace)
- **Style:** Minimal and clean with glass-morphism elements

## 6. Architecture

### Client Components
- `authentication-card.tsx` - Auth UI with Supabase integration
- `chat-sidebar.tsx` - Session management sidebar
- `chat-area.tsx` - Main chat interface

### Server Components
- `app/chat/page.tsx` - Protected chat route

### API Routes
- `app/api/chat/route.ts` - Message processing and Ollama integration

### Middleware
- `middleware.ts` - Route protection and auth check

## 7. Troubleshooting

**Chat not working:**
- Ensure Ollama is running on `localhost:11434`
- Check that llama2 model is pulled
- Verify Supabase connection

**Auth issues:**
- Confirm Supabase credentials are correctly set
- Check that email confirmation is enabled/disabled based on your settings

**Database errors:**
- Ensure all SQL from setup script executed successfully
- Verify RLS policies are properly set

## 8. Development

Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

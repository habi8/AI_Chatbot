-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow this script to be re-run after partial setup attempts.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON public.messages;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their sessions" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions AS cs
      WHERE cs.id = session_id
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their sessions" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions AS cs
      WHERE cs.id = session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- Refresh Supabase/PostgREST schema cache so new tables are visible immediately.
NOTIFY pgrst, 'reload schema';

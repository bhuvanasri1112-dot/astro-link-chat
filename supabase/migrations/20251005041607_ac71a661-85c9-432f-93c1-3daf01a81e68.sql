-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('astronaut', 'relative');

-- Create enum for connection status
CREATE TYPE connection_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  mission_name TEXT, -- For astronauts
  relationship TEXT, -- For relatives (e.g., "Mother", "Spouse")
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status connection_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, requested_id),
  CHECK (requester_id != requested_id)
);

-- Create routed_messages table (messages sent through AI)
CREATE TABLE routed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_conversations table (direct AI chats)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE routed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for connections
CREATE POLICY "Users can view their connections" ON connections
  FOR SELECT USING (
    requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    requested_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create connection requests" ON connections
  FOR INSERT WITH CHECK (
    requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update connection status for their received requests" ON connections
  FOR UPDATE USING (
    requested_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for routed_messages
CREATE POLICY "Users can view messages they sent or received" ON routed_messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages as sender" ON routed_messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their received messages" ON routed_messages
  FOR UPDATE USING (
    recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for ai_conversations
CREATE POLICY "Users can view their own conversations" ON ai_conversations
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE routed_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
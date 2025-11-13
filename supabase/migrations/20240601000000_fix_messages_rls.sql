-- Drop existing policies for messages table if they exist
DROP POLICY IF EXISTS "Enable read for users in match" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for users in match" ON public.messages;

-- Create a new, correct policy for SELECT
CREATE POLICY "Enable read for users in match"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM matches
    WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Create a new, correct policy for INSERT
CREATE POLICY "Enable insert for users in match"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM matches
    WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid()) AND messages.sender_id = auth.uid()
  )
);

-- Enable RLS on the messages table if it's not already
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
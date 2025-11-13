--
-- Enable Realtime for messages table
--

-- 1. Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Set replica identity to FULL
-- This is required for RLS to work with realtime broadcasts
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Add the table to the supabase_realtime publication
-- This will start broadcasting changes
-- NOTE: This may fail if the table is already in the publication, which is okay.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;

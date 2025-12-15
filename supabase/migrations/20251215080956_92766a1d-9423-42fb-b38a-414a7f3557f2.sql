-- Create call_logs table to store call history
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, missed, ended
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own call logs"
ON public.call_logs
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own calls"
ON public.call_logs
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they are part of"
ON public.call_logs
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
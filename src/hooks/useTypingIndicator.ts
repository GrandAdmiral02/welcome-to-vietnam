import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

export const useTypingIndicator = (
  matchId: string | null,
  currentUserId: string | null,
  currentUserName: string | null
) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to presence
  useEffect(() => {
    if (!matchId || !currentUserId) return;

    const channel = supabase.channel(`typing:${matchId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== currentUserId && presences.length > 0) {
            const presence = presences[0] as { isTyping?: boolean; name?: string; avatar?: string };
            if (presence.isTyping) {
              typing.push({
                id: key,
                name: presence.name || 'Người dùng',
                avatar: presence.avatar,
              });
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            isTyping: false,
            name: currentUserName,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [matchId, currentUserId, currentUserName]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || isTypingRef.current) return;
    
    isTypingRef.current = true;
    await channelRef.current.track({
      isTyping: true,
      name: currentUserName,
      online_at: new Date().toISOString(),
    });
  }, [currentUserName]);

  const stopTyping = useCallback(async () => {
    if (!channelRef.current || !isTypingRef.current) return;
    
    isTypingRef.current = false;
    await channelRef.current.track({
      isTyping: false,
      name: currentUserName,
      online_at: new Date().toISOString(),
    });
  }, [currentUserName]);

  const handleTyping = useCallback(() => {
    startTyping();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1500);
  }, [startTyping, stopTyping]);

  return {
    typingUsers,
    handleTyping,
    stopTyping,
  };
};

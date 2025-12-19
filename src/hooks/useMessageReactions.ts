import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useMessageReactions = (matchId: string | null, currentUserId: string | null) => {
  const [reactions, setReactions] = useState<Map<string, MessageReaction[]>>(new Map());

  // Fetch initial reactions
  useEffect(() => {
    if (!matchId) return;

    const fetchReactions = async () => {
      // First get all message IDs for this match
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('match_id', matchId);

      if (!messages || messages.length === 0) return;

      const messageIds = messages.map(m => m.id);

      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) {
        console.error('Error fetching reactions:', error);
        return;
      }

      const reactionsMap = new Map<string, MessageReaction[]>();
      (data || []).forEach(reaction => {
        const existing = reactionsMap.get(reaction.message_id) || [];
        reactionsMap.set(reaction.message_id, [...existing, reaction as MessageReaction]);
      });
      setReactions(reactionsMap);
    };

    fetchReactions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`reactions:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as MessageReaction;
            setReactions(prev => {
              const updated = new Map(prev);
              const existing = updated.get(newReaction.message_id) || [];
              updated.set(newReaction.message_id, [...existing, newReaction]);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as { id: string; message_id: string };
            setReactions(prev => {
              const updated = new Map(prev);
              const existing = updated.get(oldReaction.message_id) || [];
              updated.set(
                oldReaction.message_id,
                existing.filter(r => r.id !== oldReaction.id)
              );
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const getReactionsForMessage = useCallback((messageId: string): ReactionCount[] => {
    const messageReactions = reactions.get(messageId) || [];
    const emojiCounts = new Map<string, { count: number; hasReacted: boolean }>();

    messageReactions.forEach(reaction => {
      const existing = emojiCounts.get(reaction.emoji) || { count: 0, hasReacted: false };
      emojiCounts.set(reaction.emoji, {
        count: existing.count + 1,
        hasReacted: existing.hasReacted || reaction.user_id === currentUserId,
      });
    });

    return Array.from(emojiCounts.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: data.hasReacted,
    }));
  }, [reactions, currentUserId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    const messageReactions = reactions.get(messageId) || [];
    const existingReaction = messageReactions.find(
      r => r.user_id === currentUserId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });
    }
  }, [currentUserId, reactions]);

  return {
    getReactionsForMessage,
    toggleReaction,
  };
};

export const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😠'];

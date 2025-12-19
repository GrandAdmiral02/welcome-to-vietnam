import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { ReactionCount, QUICK_REACTIONS } from '@/hooks/useMessageReactions';
import { useState } from 'react';

interface MessageReactionsProps {
  reactions: ReactionCount[];
  onToggleReaction: (emoji: string) => void;
  isSender: boolean;
}

export const MessageReactions = ({ reactions, onToggleReaction, isSender }: MessageReactionsProps) => {
  if (reactions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-wrap gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}
    >
      {reactions.map(({ emoji, count, hasReacted }) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggleReaction(emoji)}
          className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
            transition-colors cursor-pointer
            ${hasReacted 
              ? 'bg-primary/20 border border-primary/30' 
              : 'bg-muted/80 border border-border/50 hover:bg-muted'
            }
          `}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </motion.button>
      ))}
    </motion.div>
  );
};

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  isVisible: boolean;
}

export const ReactionPicker = ({ onSelectReaction, isVisible }: ReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isVisible && !isOpen) return null;

  return (
    <AnimatePresence>
      {(isVisible || isOpen) && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full hover:bg-muted"
              >
                <SmilePlus className="w-4 h-4 text-muted-foreground" />
              </Button>
            </motion.div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-2 border-border/50 shadow-lg" 
            side="top" 
            align="center"
            sideOffset={5}
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-1"
            >
              {QUICK_REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onSelectReaction(emoji);
                    setIsOpen(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-muted rounded-lg transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          </PopoverContent>
        </Popover>
      )}
    </AnimatePresence>
  );
};

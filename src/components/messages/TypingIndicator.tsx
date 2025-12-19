import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (typingUsers.length === 0) return null;

  const displayName = typingUsers.length === 1 
    ? typingUsers[0].name 
    : `${typingUsers.length} người`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      {typingUsers.length === 1 && (
        <Avatar className="w-6 h-6">
          <AvatarImage src={typingUsers[0].avatar} />
          <AvatarFallback className="text-[10px] bg-primary/10">
            {typingUsers[0].name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/30">
        <span className="text-xs text-muted-foreground">{displayName} đang nhập</span>
        <div className="flex items-center gap-0.5">
          <motion.span
            className="w-1.5 h-1.5 bg-primary rounded-full"
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 bg-primary rounded-full"
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 bg-primary rounded-full"
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

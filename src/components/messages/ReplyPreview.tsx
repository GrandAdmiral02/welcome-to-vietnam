import { X, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ReplyPreviewProps {
  replyToMessage: {
    id: string;
    content: string;
    sender_name: string;
    type: 'text' | 'image';
  };
  onCancelReply: () => void;
}

export const ReplyPreview = ({ replyToMessage, onCancelReply }: ReplyPreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      className="mx-4 mb-2 p-3 bg-muted/50 rounded-xl border border-border/50 flex items-center gap-3"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
        <Reply className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
        <p className="text-xs font-medium text-primary truncate">
          Đang trả lời {replyToMessage.sender_name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {replyToMessage.type === 'image' ? '📷 Hình ảnh' : replyToMessage.content}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 w-7 h-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
        onClick={onCancelReply}
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};

interface QuotedMessageProps {
  content: string;
  senderName: string;
  type: 'text' | 'image';
  isSender: boolean;
  onClick?: () => void;
}

export const QuotedMessage = ({ content, senderName, type, isSender, onClick }: QuotedMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mb-1.5 p-2 rounded-lg cursor-pointer transition-colors ${
        isSender 
          ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
          : 'bg-background/50 hover:bg-background/70'
      }`}
      onClick={onClick}
    >
      <div className={`border-l-2 pl-2 ${isSender ? 'border-primary-foreground/50' : 'border-primary/50'}`}>
        <p className={`text-[10px] font-medium truncate ${isSender ? 'text-primary-foreground/70' : 'text-primary/70'}`}>
          {senderName}
        </p>
        <p className={`text-xs truncate ${isSender ? 'text-primary-foreground/80' : 'text-foreground/80'}`}>
          {type === 'image' ? '📷 Hình ảnh' : content}
        </p>
      </div>
    </motion.div>
  );
};

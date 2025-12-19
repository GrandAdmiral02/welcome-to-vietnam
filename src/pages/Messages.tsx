import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Send, MessageCircle, Loader2, Image as ImageIcon, Trash2, MoreHorizontal, Phone, Smile, Check, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import VoiceCallUI from '@/components/VoiceCallUI';
import { motion, AnimatePresence } from 'framer-motion';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { MessageReactions, ReactionPicker } from '@/components/messages/MessageReactions';
import { TypingIndicator } from '@/components/messages/TypingIndicator';

// --- Interfaces ---
interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string;
  last_active?: string;
}

interface Match {
  id: string;
  other_user: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  type: 'text' | 'image';
  is_read: boolean;
}

// --- Helper Components ---
const useSecureImage = (path: string | null) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setImageUrl(null); return; }
    let objectUrl: string;
    const downloadImage = async () => {
      try {
        const { data, error } = await supabase.storage.from('message_attachments').download(path);
        if (error) throw error;
        objectUrl = URL.createObjectURL(data);
        setImageUrl(objectUrl);
      } catch (error) { console.error('Error downloading image:', error); }
    };
    downloadImage();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return { imageUrl };
};

const ImageMessage = ({ path }: { path: string }) => {
  const { imageUrl } = useSecureImage(path);
  if (!imageUrl) return (
    <div className="flex items-center justify-center w-48 h-48 bg-muted/50 rounded-xl">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  return (
    <img 
      src={imageUrl} 
      alt="Ảnh" 
      className="rounded-xl max-w-full h-auto block shadow-md hover:shadow-lg transition-shadow cursor-pointer" 
      style={{ maxHeight: '300px', maxWidth: '280px' }} 
    />
  );
};

// Online status indicator
const OnlineStatus = ({ lastActive }: { lastActive?: string }) => {
  const isOnline = lastActive && (new Date().getTime() - new Date(lastActive).getTime()) < 5 * 60 * 1000;
  
  return (
    <motion.span 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/50'}`}
    >
      {isOnline && (
        <motion.span
          className="absolute inset-0 rounded-full bg-green-500"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.span>
  );
};

// --- Main Component ---
const MessagesPage = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [retractionTarget, setRetractionTarget] = useState<Message | null>(null);
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set());
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice call hook
  const { callState, startCall, acceptCall, rejectCall, endCall } = useVoiceCall();

  // Typing indicator hook
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(
    selectedMatch?.id || null,
    user?.id || null,
    profile?.full_name || null
  );

  // Message reactions hook
  const { getReactionsForMessage, toggleReaction } = useMessageReactions(
    selectedMatch?.id || null,
    user?.id || null
  );

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: hiddenData, error: hiddenError } = await supabase
        .from('hidden_conversations')
        .select('match_id')
        .eq('user_id', user.id);

      if (hiddenError) throw hiddenError;
      const hiddenMatchIds = new Set((hiddenData || []).map(h => h.match_id));

      const { data: mData, error: mError } = await supabase.from('matches').select('id, user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      if (mError) throw mError;
      
      const visibleMatchesData = (mData || []).filter(m => !hiddenMatchIds.has(m.id));
      if (visibleMatchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }
      
      const otherUserIds = visibleMatchesData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
      if (otherUserIds.length === 0) { setMatches([]); setLoading(false); return; }

      const { data: pData, error: pError } = await supabase.from('profiles').select('user_id, full_name, avatar_url, last_active').in('user_id', otherUserIds);
      if (pError) throw pError;
      
      const profilesMap = new Map((pData || []).map(p => [p.user_id, p]));
      
      // Fetch last message for each match
      const matchIds = visibleMatchesData.map(m => m.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });
      
      const lastMessageMap = new Map<string, Message>();
      const unreadCountMap = new Map<string, number>();
      
      (lastMessages || []).forEach(msg => {
        if (!lastMessageMap.has(msg.match_id)) {
          lastMessageMap.set(msg.match_id, msg as Message);
        }
        if (msg.recipient_id === user.id && !msg.is_read) {
          unreadCountMap.set(msg.match_id, (unreadCountMap.get(msg.match_id) || 0) + 1);
        }
      });
      
      const populatedMatches = visibleMatchesData
        .map(m => ({
          id: m.id,
          other_user: profilesMap.get(m.user1_id === user.id ? m.user2_id : m.user1_id) as Profile,
          lastMessage: lastMessageMap.get(m.id),
          unreadCount: unreadCountMap.get(m.id) || 0
        }))
        .filter(m => m.other_user)
        .sort((a, b) => {
          const aTime = a.lastMessage?.created_at || '';
          const bTime = b.lastMessage?.created_at || '';
          return bTime.localeCompare(aTime);
        });
      
      setMatches(populatedMatches);
    } catch (error) { console.error("Error fetching matches:", error); } 
    finally { setLoading(false); }
  }, [user]);

  const fetchMessages = useCallback(async (matchId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const markMessagesAsRead = useCallback(async (matchId: string) => {
    if (!user?.id) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('match_id', matchId)
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    
    // Update local state
    setMatches(prev => prev.map(m => 
      m.id === matchId ? { ...m, unreadCount: 0 } : m
    ));
  }, [user]);

  useEffect(() => { if (user) fetchMatches(); }, [user, fetchMatches]);
  
  useEffect(() => {
    const matchIdFromUrl = searchParams.get('match');
    if (matchIdFromUrl && matches.length > 0) {
      const matchFromUrl = matches.find(m => m.id === matchIdFromUrl);
      if (matchFromUrl) {
        setSelectedMatch(matchFromUrl);
      }
    }
  }, [searchParams, matches]);

  useEffect(() => {
    if (selectedMatch) {
      fetchMessages(selectedMatch.id);
      markMessagesAsRead(selectedMatch.id);
      
      const channel = supabase
        .channel(`messages-${selectedMatch.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${selectedMatch.id}`
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.recipient_id === user?.id) {
            markMessagesAsRead(selectedMatch.id);
          }
          // Update last message in matches list
          setMatches(prev => prev.map(m => 
            m.id === selectedMatch.id ? { ...m, lastMessage: newMsg } : m
          ));
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${selectedMatch.id}`
        }, (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedMatch, fetchMessages, markMessagesAsRead, user?.id]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || !user?.id) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    stopTyping();
    
    await supabase.from('messages').insert({
      match_id: selectedMatch.id,
      sender_id: user.id,
      recipient_id: selectedMatch.other_user.user_id,
      content: messageContent,
      type: 'text'
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMatch || !user?.id) return;
    
    setIsUploading(true);
    try {
      const filePath = `${selectedMatch.id}/${uuidv4()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      await supabase.from('messages').insert({
        match_id: selectedMatch.id,
        sender_id: user.id,
        recipient_id: selectedMatch.other_user.user_id,
        content: filePath,
        type: 'image'
      });
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetractForEveryone = async () => {
    if (!retractionTarget) return;
    await supabase.from('messages').delete().eq('id', retractionTarget.id);
    setRetractionTarget(null);
  };

  const handleDeleteForMe = () => {
    if (!retractionTarget) return;
    setDeletedForMeIds(prev => new Set(prev).add(retractionTarget.id));
    setRetractionTarget(null);
  };
  
  const handleHideConversation = async () => {
    if (!matchToDelete || !user) return;

    const matchToHide = matchToDelete;
    
    setMatches(prev => prev.filter(m => m.id !== matchToHide.id));
    if (selectedMatch?.id === matchToHide.id) {
      setSelectedMatch(null);
    }
    setMatchToDelete(null);

    const { error } = await supabase.from('hidden_conversations').insert({
      user_id: user.id,
      match_id: matchToHide.id
    });

    if (error) {
      console.error("Error hiding conversation:", error);
      fetchMatches(); 
    }
  };

  const handleStartCall = () => {
    if (!selectedMatch || !user?.id || !profile) return;
    startCall(
      selectedMatch.id,
      selectedMatch.other_user.user_id,
      profile.full_name || 'Người dùng',
      profile.avatar_url || ''
    );
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const visibleMessages = messages.filter(msg => !deletedForMeIds.has(msg.id));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping absolute" />
            <MessageCircle className="w-16 h-16 text-primary relative" />
          </div>
          <p className="text-muted-foreground">Đang tải tin nhắn...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <VoiceCallUI
        callState={callState}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
      />

      <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* --- Sidebar with Conversation List --- */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`w-full md:w-96 border-r border-border/50 flex flex-col bg-card/50 backdrop-blur-sm ${selectedMatch ? 'hidden md:flex' : 'flex'}`}
        >
          <header className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Tin nhắn</span>
            </h2>
          </header>
          
          <ScrollArea className="flex-1">
            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 shadow-inner">
                  <MessageCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Chưa có cuộc trò chuyện</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Kết đôi với ai đó để bắt đầu nhắn tin
                </p>
              </div>
            ) : (
              <div className="py-2">
                {matches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className={`flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 hover:bg-primary/5 ${selectedMatch?.id === match.id ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-l-primary' : ''}`}>
                      <div className="relative">
                        <Avatar className="w-14 h-14 ring-2 ring-border shadow-md">
                          <AvatarImage src={match.other_user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                            {match.other_user.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus lastActive={match.other_user.last_active} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold truncate">{match.other_user.full_name}</p>
                          {match.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(match.lastMessage.created_at), { addSuffix: false, locale: vi })}
                            </span>
                          )}
                        </div>
                        {match.lastMessage && (
                          <p className={`text-sm truncate mt-0.5 ${match.unreadCount ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {match.lastMessage.sender_id === user?.id && 'Bạn: '}
                            {match.lastMessage.type === 'image' ? '📷 Đã gửi ảnh' : match.lastMessage.content}
                          </p>
                        )}
                      </div>
                      
                      {(match.unreadCount ?? 0) > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5 shadow-md"
                        >
                          {match.unreadCount}
                        </motion.span>
                      )}
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMatchToDelete(match);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa cuộc trò chuyện
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.aside>

        {/* --- Main Chat Window --- */}
        <main className={`flex-1 flex-col bg-background ${selectedMatch ? 'flex' : 'hidden md:flex'}`}>
          {selectedMatch ? (
            <>
              {/* Chat Header */}
              <motion.header 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-4 p-4 border-b border-border/50 bg-gradient-to-r from-card/80 to-card/50 backdrop-blur-sm"
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden" 
                  onClick={() => setSelectedMatch(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-border shadow-md">
                    <AvatarImage src={selectedMatch.other_user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                      {selectedMatch.other_user.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatus lastActive={selectedMatch.other_user.last_active} />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedMatch.other_user.full_name}</h3>
                  <AnimatePresence mode="wait">
                    {typingUsers.length > 0 ? (
                      <motion.p 
                        key="typing"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="text-sm text-primary font-medium"
                      >
                        Đang nhập...
                      </motion.p>
                    ) : (
                      <motion.p 
                        key="status"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="text-sm text-muted-foreground"
                      >
                        {selectedMatch.other_user.last_active && (
                          new Date().getTime() - new Date(selectedMatch.other_user.last_active).getTime() < 5 * 60 * 1000
                            ? 'Đang hoạt động'
                            : `Hoạt động ${formatDistanceToNow(new Date(selectedMatch.other_user.last_active), { addSuffix: true, locale: vi })}`
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartCall}
                  disabled={callState.isInCall || callState.isRinging || callState.isReceivingCall}
                  className="text-primary hover:bg-primary/10 rounded-full w-11 h-11"
                >
                  <Phone className="w-5 h-5" />
                </Button>
              </motion.header>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-transparent to-muted/10">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    <AnimatePresence initial={false}>
                      {visibleMessages.map((msg, index) => {
                        const isSender = msg.sender_id === user?.id;
                        const showAvatar = !isSender && (
                          index === 0 || 
                          visibleMessages[index - 1]?.sender_id !== msg.sender_id
                        );
                        const reactions = getReactionsForMessage(msg.id);
                        const isHovered = hoveredMessageId === msg.id;
                        
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`group flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            {!isSender && (
                              <div className="w-8">
                                {showAvatar && (
                                  <Avatar className="w-8 h-8 shadow-sm">
                                    <AvatarImage src={selectedMatch.other_user.avatar_url} />
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5">
                                      {selectedMatch.other_user.full_name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            
                            {/* Actions for sender messages */}
                            {isSender && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ReactionPicker
                                  isVisible={isHovered}
                                  onSelectReaction={(emoji) => toggleReaction(msg.id, emoji)}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-7 h-7" 
                                  onClick={() => setRetractionTarget(msg)}
                                >
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            )}
                            
                            <div className={`relative max-w-[70%] ${isSender ? 'order-1' : ''}`}>
                              {/* Message Bubble */}
                              <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                isSender 
                                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md' 
                                  : 'bg-gradient-to-br from-muted to-muted/80 rounded-bl-md border border-border/30'
                              }`}>
                                {msg.type === 'image' ? (
                                  <ImageMessage path={msg.content} />
                                ) : (
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                )}
                              </div>
                              
                              {/* Reactions Display */}
                              <MessageReactions
                                reactions={reactions}
                                onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                                isSender={isSender}
                              />
                              
                              {/* Time and Read Status */}
                              <div className={`flex items-center gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </span>
                                {isSender && (
                                  msg.is_read 
                                    ? <CheckCheck className="w-3.5 h-3.5 text-primary" />
                                    : <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            {/* Actions for received messages */}
                            {!isSender && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ReactionPicker
                                  isVisible={isHovered}
                                  onSelectReaction={(emoji) => toggleReaction(msg.id, emoji)}
                                />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}
                    </AnimatePresence>
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <motion.footer 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 border-t border-border/50 bg-gradient-to-r from-card/80 to-card/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full shrink-0 hover:bg-primary/10"
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                  <Input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full shrink-0 hover:bg-primary/10"
                      >
                        <Smile className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                      <Picker 
                        data={data} 
                        onEmojiSelect={handleEmojiSelect}
                        theme="auto"
                        locale="vi"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Input 
                    ref={inputRef}
                    value={newMessage} 
                    onChange={handleInputChange} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
                    placeholder="Nhập tin nhắn..." 
                    className="flex-1 rounded-full bg-muted/50 border-border/30 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  />
                  
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!newMessage.trim()}
                    className="rounded-full w-11 h-11 p-0 shrink-0 shadow-md bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </motion.footer>
            </>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Chọn một cuộc trò chuyện</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Bắt đầu gửi tin nhắn cho những người bạn đã kết đôi
                </p>
              </motion.div>
            </div>
          )}
        </main>
        
        {/* --- Alert Dialogs --- */}
        <AlertDialog open={retractionTarget !== null} onOpenChange={() => setRetractionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Chọn cách bạn muốn xóa tin nhắn này.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <Button variant="outline" onClick={handleDeleteForMe}>Xóa ở phía tôi</Button>
              <Button variant="destructive" onClick={handleRetractForEveryone}>Thu hồi với mọi người</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={matchToDelete !== null} onOpenChange={() => setMatchToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa cuộc trò chuyện này?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Cuộc trò chuyện này sẽ biến mất khỏi danh sách của bạn, nhưng người kia vẫn sẽ thấy nó.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleHideConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default MessagesPage;

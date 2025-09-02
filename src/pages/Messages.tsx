import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Send, MessageCircle, Users, Heart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  status: string;
  other_user: {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url: string;
    age: number;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const Messages = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  useEffect(() => {
    const matchId = searchParams.get('match');
    if (matchId && matches.length > 0) {
      const match = matches.find(m => m.id === matchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  }, [searchParams, matches]);

  useEffect(() => {
    if (selectedMatch) {
      fetchMessages(selectedMatch.id);
      setupRealtimeSubscription(selectedMatch.id);
    }
  }, [selectedMatch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at,
          status
        `)
        .eq('status', 'matched')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        return;
      }

      // Fetch other user details and last messages
      const matchesWithDetails = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
          
          // Fetch other user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, user_id, full_name, avatar_url, age')
            .eq('user_id', otherUserId)
            .single();

          // Fetch last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...match,
            other_user: profileData,
            last_message: lastMessageData
          };
        })
      );

      setMatches(matchesWithDetails.filter(m => m.other_user));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách kết nối",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const setupRealtimeSubscription = (matchId: string) => {
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: selectedMatch.id,
          sender_id: user?.id,
          content: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Lỗi",
          description: "Không thể gửi tin nhắn",
          variant: "destructive",
        });
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi gửi tin nhắn",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {selectedMatch ? selectedMatch.other_user.full_name : 'Tin nhắn'}
            </Button>
            {selectedMatch && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Heart className="w-3 h-3 mr-1" />
                  Đã kết nối
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Matches List */}
        <div className="w-80 border-r bg-card/50 backdrop-blur-sm overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Tin nhắn
            </h2>
            
            {matches.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có kết nối nào</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate('/discover')}
                >
                  Khám phá ngay
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedMatch?.id === match.id ? 'bg-primary/10 border-primary' : ''
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={match.other_user.avatar_url} />
                          <AvatarFallback>
                            {match.other_user.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {match.other_user.full_name}
                          </h3>
                          {match.last_message ? (
                            <p className="text-sm text-muted-foreground truncate">
                              {match.last_message.sender_id === user?.id ? 'Bạn: ' : ''}
                              {match.last_message.content}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Bắt đầu cuộc trò chuyện...
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {match.last_message 
                              ? format(new Date(match.last_message.created_at), 'HH:mm dd/MM')
                              : format(new Date(match.created_at), 'dd/MM/yyyy')
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedMatch ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Bắt đầu cuộc trò chuyện với {selectedMatch.other_user.full_name}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender_id === user?.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(message.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t bg-background/80 backdrop-blur-sm p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Chọn một cuộc trò chuyện</h3>
                  <p className="text-muted-foreground">
                    Chọn một kết nối để bắt đầu nhắn tin
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
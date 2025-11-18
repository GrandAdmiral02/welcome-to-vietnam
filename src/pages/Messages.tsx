import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Send, MessageCircle, Users, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// --- Interfaces ---
interface Profile {
    user_id: string;
    full_name: string;
    avatar_url: string;
}

interface Match {
    id: string;
    other_user: Profile;
}

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string; // Ensure this is here
    content: string;
    created_at: string;
    type: 'text' | 'image';
    is_read: boolean; // And this one
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
    if (!imageUrl) return <div className="flex items-center justify-center w-24 h-24"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    return <img src={imageUrl} alt="Gửi ảnh" className="rounded-lg max-w-full h-auto block" style={{ maxHeight: '300px' }} />;
};

// --- Main Component ---
const MessagesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [matches, setMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [retractionTarget, setRetractionTarget] = useState<Message | null>(null);
    const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user's matches
    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: mData, error: mError } = await supabase.from('matches').select('id, user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            if (mError) throw mError;
            const otherUserIds = mData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
            if (otherUserIds.length === 0) { setMatches([]); setLoading(false); return; }
            const { data: pData, error: pError } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', otherUserIds);
            if (pError) throw pError;
            const profilesMap = new Map(pData.map(p => [p.user_id, p]));
            const populatedMatches = mData.map(m => ({ id: m.id, other_user: profilesMap.get(m.user1_id === user.id ? m.user2_id : m.user1_id) as Profile })).filter(m => m.other_user);
            setMatches(populatedMatches);
        } catch (error) { console.error("Error fetching matches:", error); } 
        finally { setLoading(false); }
    }, [user]);

    // Fetch messages for a selected match
    const fetchMessages = useCallback(async (matchId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
        } catch (error) { console.error("Error fetching messages:", error); } 
        finally { setLoadingMessages(false); }
    }, []);

    // [NEW] Mark incoming messages as read
    const markMessagesAsRead = useCallback(async (matchId: string) => {
        if (!user) return;
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);
    }, [user]);

    // Initial data fetching
    useEffect(() => { if (user) fetchMatches(); }, [user, fetchMatches]);

    // Handle selecting a match from URL param
    useEffect(() => {
        const matchId = searchParams.get('match_id');
        if (matchId && matches.length > 0) {
            const matchToSelect = matches.find(m => m.id === matchId);
            if (matchToSelect) {
                setSelectedMatch(matchToSelect);
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete('match_id');
                setSearchParams(newSearchParams, { replace: true });
            }
        }
    }, [searchParams, matches, setSearchParams]);

    // Real-time message subscription and marking as read
    useEffect(() => {
        if (!selectedMatch) return;

        fetchMessages(selectedMatch.id);
        markMessagesAsRead(selectedMatch.id);

        const channel = supabase.channel(`messages:${selectedMatch.id}`)
            .on<Message>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${selectedMatch.id}` }, 
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                    // Mark as read immediately if the user is the recipient
                    if (payload.new.recipient_id === user?.id) {
                        markMessagesAsRead(selectedMatch.id);
                    }
                }
            )
            .on<Message>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `match_id=eq.${selectedMatch.id}` }, 
                (payload) => {
                    setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedMatch, fetchMessages, markMessagesAsRead, user?.id]);

    // Auto-scroll to latest message
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // [MODIFIED] Send text message with recipient_id
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedMatch || !user) return;
        const { error } = await supabase.from('messages').insert({
            match_id: selectedMatch.id,
            sender_id: user.id,
            recipient_id: selectedMatch.other_user.user_id, // Add recipient
            content: newMessage.trim(),
            type: 'text',
            is_read: false
        });
        if (error) {
            console.error("Error sending message:", error);
        } else {
            setNewMessage('');
        }
    };

    // [MODIFIED] Send image message with recipient_id
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !selectedMatch || !user) return;
        const file = event.target.files[0];
        const filePath = `${selectedMatch.id}/${uuidv4()}`;
        setIsUploading(true);
        try {
            const { error: upError } = await supabase.storage.from('message_attachments').upload(filePath, file);
            if (upError) throw upError;
            const { error: insError } = await supabase.from('messages').insert({
                match_id: selectedMatch.id,
                sender_id: user.id,
                recipient_id: selectedMatch.other_user.user_id, // Add recipient
                content: filePath,
                type: 'image',
                is_read: false
            });
            if (insError) throw insError;
        } catch (error) { console.error('Error uploading image:', error); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleRetractForEveryone = async () => {
        if (!retractionTarget) return;
        const messageToRetract = retractionTarget;
        setRetractionTarget(null);
        setMessages((prev) => prev.filter(msg => msg.id !== messageToRetract.id));
        const { error } = await supabase.from('messages').delete().eq('id', messageToRetract.id);
        if (error) {
            console.error("Error retracting message:", error);
            alert("Không thể thu hồi tin nhắn. Hãy chắc chắn bạn đã cấp quyền DELETE trong chính sách RLS của Supabase.");
            setMessages((prev) => [...prev, messageToRetract].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        }
    };

    const handleDeleteForMe = () => {
        if (!retractionTarget) return;
        setDeletedForMeIds(prev => new Set(prev).add(retractionTarget.id));
        setRetractionTarget(null);
    };

    const visibleMessages = messages.filter(msg => !deletedForMeIds.has(msg.id));

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-background text-foreground">
            <aside className={`w-full md:w-80 border-r flex flex-col transition-all duration-300 ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
                <header className="p-4 border-b sticky top-0 bg-background"><h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" />Tin nhắn</h2></header>
                <div className="flex-1 overflow-y-auto">
                   {matches.map(match => (
                        <div key={match.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted ${selectedMatch?.id === match.id ? 'bg-muted' : ''}`} onClick={() => setSelectedMatch(match)}>
                            <Avatar><AvatarImage src={match.other_user.avatar_url} /><AvatarFallback>{match.other_user.full_name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1"><p className="font-semibold">{match.other_user.full_name}</p></div>
                        </div>
                    ))}
                </div>
            </aside>
            <main className={`flex-1 flex-col ${selectedMatch ? 'flex' : 'hidden md:flex'}`}>
                {selectedMatch ? (<>
                    <header className="flex items-center gap-4 p-3 border-b">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedMatch(null)}><ArrowLeft className="w-5 h-5" /></Button>
                        <Avatar><AvatarImage src={selectedMatch.other_user.avatar_url} /><AvatarFallback>{selectedMatch.other_user.full_name.charAt(0)}</AvatarFallback></Avatar>
                        <h3 className="font-semibold text-lg">{selectedMatch.other_user.full_name}</h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                            visibleMessages.map(msg => (
                                <div key={msg.id} className={`group flex items-center gap-2 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender_id === user?.id && (
                                        <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100" onClick={() => setRetractionTarget(msg)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <div className={`p-3 rounded-2xl max-w-xs sm:max-w-md ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {msg.type === 'image' ? <ImageMessage path={msg.content} /> : <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                                        <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.created_at), 'HH:mm')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <footer className="p-4 border-t">
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}</Button>
                            <Input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Nhập tin nhắn..." />
                            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}><Send className="w-5 h-5" /></Button>
                        </div>
                    </footer>
                </>) : (
                    <div className="flex-1 hidden md:flex items-center justify-center"><div className="text-center"><MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" /><h3 className="mt-4 text-lg font-semibold">Chọn một cuộc trò chuyện</h3></div></div>
                )}
            </main>
            <AlertDialog open={retractionTarget !== null} onOpenChange={() => setRetractionTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Chọn cách bạn muốn xóa tin nhắn này.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <Button variant="outline" onClick={handleDeleteForMe}>Xóa ở phía tôi</Button>
                        <Button variant="destructive" onClick={handleRetractForEveryone}>Thu hồi với mọi người</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MessagesPage;

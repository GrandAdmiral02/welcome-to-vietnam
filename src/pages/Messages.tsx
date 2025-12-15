
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Send, MessageCircle, Loader2, Image as ImageIcon, Trash2, MoreHorizontal } from 'lucide-react';
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
    const [matchToDelete, setMatchToDelete] = useState<Match | null>(null); // State for conversation deletion

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Get hidden conversation IDs for the current user
            const { data: hiddenData, error: hiddenError } = await supabase
                .from('hidden_conversations')
                .select('match_id')
                .eq('user_id', user.id);

            if (hiddenError) throw hiddenError;
            const hiddenMatchIds = new Set(hiddenData.map(h => h.match_id));

            // 2. Fetch all matches involving the user
            const { data: mData, error: mError } = await supabase.from('matches').select('id, user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            if (mError) throw mError;
            
            // 3. Filter out hidden matches locally before fetching profiles
            const visibleMatchesData = mData.filter(m => !hiddenMatchIds.has(m.id));
            if (visibleMatchesData.length === 0) {
                setMatches([]);
                setLoading(false);
                return;
            }
            
            const otherUserIds = visibleMatchesData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
            if (otherUserIds.length === 0) { setMatches([]); setLoading(false); return; }

            // 4. Fetch profiles for visible matches
            const { data: pData, error: pError } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', otherUserIds);
            if (pError) throw pError;
            
            const profilesMap = new Map(pData.map(p => [p.user_id, p]));
            const populatedMatches = visibleMatchesData.map(m => ({ id: m.id, other_user: profilesMap.get(m.user1_id === user.id ? m.user2_id : m.user1_id) as Profile })).filter(m => m.other_user);
            
            setMatches(populatedMatches);
        } catch (error) { console.error("Error fetching matches:", error); } 
        finally { setLoading(false); }
    }, [user]);

    const fetchMessages = useCallback(async (matchId: string) => { /* ... no changes ... */ }, []);
    const markMessagesAsRead = useCallback(async (matchId: string) => { /* ... no changes ... */ }, [user]);

    useEffect(() => { if (user) fetchMatches(); }, [user, fetchMatches]);
    useEffect(() => { /* ... no changes ... */ }, [searchParams, matches, setSearchParams]);
    useEffect(() => { /* ... no changes ... */ }, [selectedMatch, fetchMessages, markMessagesAsRead, user?.id]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSendMessage = async () => { /* ... no changes ... */ };
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { /* ... no changes ... */ };
    const handleRetractForEveryone = async () => { /* ... no changes ... */ };
    const handleDeleteForMe = () => { /* ... no changes ... */ };
    
    // --- NEW: Function to hide a conversation ---
    const handleHideConversation = async () => {
        if (!matchToDelete || !user) return;

        const matchToHide = matchToDelete;
        
        // Optimistically update UI
        setMatches(prev => prev.filter(m => m.id !== matchToHide.id));
        if (selectedMatch?.id === matchToHide.id) {
            setSelectedMatch(null);
        }
        setMatchToDelete(null); // Close the dialog

        // Persist the change to the backend
        const { error } = await supabase.from('hidden_conversations').insert({
            user_id: user.id,
            match_id: matchToHide.id
        });

        if (error) {
            console.error("Error hiding conversation:", error);
            alert("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
            // Revert UI change on error by refetching
            fetchMatches(); 
        }
    };

    const visibleMessages = messages.filter(msg => !deletedForMeIds.has(msg.id));

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* --- Sidebar with Conversation List --- */}
            <aside className={`w-full md:w-80 border-r flex flex-col transition-all duration-300 ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
                <header className="p-4 border-b sticky top-0 bg-background"><h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" />Tin nhắn</h2></header>
                <div className="flex-1 overflow-y-auto">
                   {matches.map(match => (
                        <div key={match.id} className="relative group" onClick={() => setSelectedMatch(match)}>
                            <div className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted ${selectedMatch?.id === match.id ? 'bg-muted' : ''}`}>
                                <Avatar><AvatarImage src={match.other_user.avatar_url} /><AvatarFallback>{match.other_user.full_name.charAt(0)}</AvatarFallback></Avatar>
                                <div className="flex-1"><p className="font-semibold truncate">{match.other_user.full_name}</p></div>
                            </div>
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        </div>
                    ))}
                </div>
            </aside>

            {/* --- Main Chat Window --- */}
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
                                <div key={msg.id} className={`group flex items-end gap-2 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
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
                    <div className="flex-1 hidden md:flex items-center justify-center"><div className="text-center"><MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" /><h3 className="mt-4 text-lg font-semibold">Chọn một cuộc trò chuyện</h3><p className="text-sm text-muted-foreground">Bắt đầu gửi tin nhắn cho những người bạn đã kết đôi.</p></div></div>
                )}
            </main>
            
            {/* --- Alert Dialog for Individual Message Deletion --- */}
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

            {/* --- NEW: Alert Dialog for Conversation Deletion --- */}
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
    );
};

export default MessagesPage;

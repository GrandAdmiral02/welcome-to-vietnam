import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Users, Loader2, Image as ImageIcon } from 'lucide-react';
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
    content: string;
    created_at: string;
    type: 'text' | 'image';
}

// --- Helper Hook & Component for Secure Images ---

// Custom hook to securely download and create a URL for an image from Supabase Storage.
const useSecureImage = (path: string | null) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!path) {
            setImageUrl(null);
            return;
        }

        let objectUrl: string;
        const downloadImage = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.storage
                    .from('message_attachments')
                    .download(path);

                if (error) throw error;

                objectUrl = URL.createObjectURL(data);
                setImageUrl(objectUrl);
            } catch (error) {
                console.error('Error downloading image:', error);
                setImageUrl(null); // Set to null on error to show a failure message
            } finally {
                setLoading(false);
            }
        };

        downloadImage();

        // Cleanup the object URL when the component unmounts or the path changes
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [path]);

    return { imageUrl, loading };
};

// Component to display the securely loaded image.
const ImageMessage = ({ path }: { path: string }) => {
    const { imageUrl, loading } = useSecureImage(path);

    if (loading) {
        return (
            <div className="flex items-center justify-center w-24 h-24">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (!imageUrl) {
        return <div className="text-destructive-foreground p-2">Không thể tải ảnh.</div>;
    }

    return (
        <img
            src={imageUrl}
            alt="Gửi ảnh"
            className="rounded-lg max-w-full h-auto block"
            style={{ maxHeight: '300px' }}
        />
    );
};


// --- Main Messages Page Component ---
const MessagesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... (fetchMatches and fetchMessages remain the same) ...
    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches').select('id, user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            if (matchesError) throw matchesError;
            const otherUserIds = matchesData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
            if (otherUserIds.length === 0) {
                setMatches([]); setLoading(false); return;
            }
            const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', otherUserIds);
            if (profilesError) throw profilesError;
            const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
            const populatedMatches = matchesData.map(match => {
                const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
                return { id: match.id, other_user: profilesMap.get(otherUserId) as Profile };
            }).filter(m => m.other_user);
            setMatches(populatedMatches);
        } catch (error) { console.error("Error fetching matches:", error); } 
        finally { setLoading(false); }
    }, [user]);

    const fetchMessages = useCallback(async (matchId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase.from('messages').select('id, sender_id, content, created_at, type').eq('match_id', matchId).order('created_at', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
        } catch (error) { console.error("Error fetching messages:", error); } 
        finally { setLoadingMessages(false); }
    }, []);

    // ... (useEffect hooks remain the same) ...
    useEffect(() => { if(user) fetchMatches(); }, [user, fetchMatches]);
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
    useEffect(() => {
        if (!selectedMatch) return;
        fetchMessages(selectedMatch.id);
        const channel = supabase.channel(`messages:${selectedMatch.id}`)
            .on<Message>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${selectedMatch.id}` }, (payload) => {
                setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedMatch, fetchMessages]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Handle sending a text message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedMatch || !user) return;
        const content = newMessage.trim();
        setNewMessage('');
        const { error } = await supabase.from('messages').insert({ match_id: selectedMatch.id, sender_id: user.id, content: content, type: 'text' });
        if (error) { console.error("Error sending message:", error); setNewMessage(content); }
    };

    // [MODIFIED] Handle uploading an image
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !selectedMatch || !user) return;
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${selectedMatch.id}/${fileName}`;

        setIsUploading(true);
        try {
            // 1. Upload the file to storage
            const { error: uploadError } = await supabase.storage.from('message_attachments').upload(filePath, file);
            if (uploadError) throw uploadError;

            // 2. Insert a message into the database with the *path*, not the public URL
            const { error: insertError } = await supabase.from('messages').insert({ 
                match_id: selectedMatch.id, 
                sender_id: user.id, 
                content: filePath, // Store the path
                type: 'image' 
            });
            if (insertError) throw insertError;

        } catch (error) {
            console.error('Error uploading image:', error);
            // Optionally, add a toast notification for the user
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
        }
    };
    
    // ... (Loading state return) ...
    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;


    // --- Render Method ---
    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Left Panel: Match List */}
            <aside className={`w-full md:w-80 border-r flex flex-col transition-all duration-300 ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
                 <header className="p-4 border-b sticky top-0 bg-background"><h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" />Tin nhắn</h2></header>
                <div className="flex-1 overflow-y-auto">
                    {matches.length > 0 ? ( matches.map(match => (
                        <div key={match.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted ${selectedMatch?.id === match.id ? 'bg-muted' : ''}`} onClick={() => setSelectedMatch(match)}>
                            <Avatar><AvatarImage src={match.other_user.avatar_url} /><AvatarFallback>{match.other_user.full_name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1"><p className="font-semibold">{match.other_user.full_name}</p></div>
                        </div>
                    ))) : (
                        <div className="text-center p-8"><Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Chưa có cuộc trò chuyện nào.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/discover')}>Bắt đầu khám phá</Button></div>
                    )}
                </div>
            </aside>

            {/* Right Panel: Chat Window */}
            <main className={`flex-1 flex-col ${selectedMatch ? 'flex' : 'hidden md:flex'}`}>
                {selectedMatch ? (<>
                    <header className="flex items-center gap-4 p-3 border-b">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedMatch(null)}><ArrowLeft className="w-5 h-5" /></Button>
                        <Avatar><AvatarImage src={selectedMatch.other_user.avatar_url} /><AvatarFallback>{selectedMatch.other_user.full_name.charAt(0)}</AvatarFallback></Avatar>
                        <h3 className="font-semibold text-lg">{selectedMatch.other_user.full_name}</h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-0 rounded-2xl ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${msg.type === 'text' ? 'p-3' : ''}`}>
                                        {/* [MODIFIED] Use the new ImageMessage component */}
                                        {msg.type === 'image' ? 
                                            <ImageMessage path={msg.content} /> :
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                                        <p className="text-xs opacity-70 mt-1 text-right px-3 pb-2">{format(new Date(msg.created_at), 'HH:mm')}</p>
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
                            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Nhập tin nhắn..." className="flex-1" />
                            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}><Send className="w-5 h-5" /></Button>
                        </div>
                    </footer>
                </>) : (
                    <div className="flex-1 hidden md:flex items-center justify-center"><div className="text-center"><MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" /><h3 className="mt-4 text-lg font-semibold">Chọn một cuộc trò chuyện</h3><p className="text-muted-foreground">Chọn một người để xem tin nhắn của bạn.</p></div></div>
                )}
            </main>
        </div>
    );
};

export default MessagesPage;

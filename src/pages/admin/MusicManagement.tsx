import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, Music4 } from 'lucide-react';
import { toast } from 'sonner';
import { getYouTubeID } from '@/lib/utils'; // Import the utility function

interface Song {
    id: string;
    title: string;
    artist: string | null;
    youtube_url: string;
}

const MusicManagementPage = () => {
    const { profile } = useAuth();
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSong, setEditingSong] = useState<Song | null>(null);
    // Store the raw URL from the input field
    const [rawYoutubeUrl, setRawYoutubeUrl] = useState('');
    const [formData, setFormData] = useState({ title: '', artist: '' });

    const fetchSongs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('songs').select('id, title, artist, youtube_url').order('created_at', { ascending: false });
            if (error) throw error;
            setSongs(data || []);
        } catch (error: any) {
            toast.error('Lỗi tải danh sách nhạc:', { description: error.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSongs();
    }, [fetchSongs]);

    const handleOpenDialog = (song: Song | null = null) => {
        setEditingSong(song);
        if (song) {
            setFormData({ title: song.title, artist: song.artist || '' });
            setRawYoutubeUrl(song.youtube_url);
        } else {
            setFormData({ title: '', artist: '' });
            setRawYoutubeUrl('');
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const videoId = getYouTubeID(rawYoutubeUrl);

        if (!formData.title || !rawYoutubeUrl) {
            toast.warning('Vui lòng nhập Tiêu đề và Link YouTube.');
            return;
        }

        if (!videoId) {
            toast.error('Link YouTube không hợp lệ.', {
                description: 'Vui lòng kiểm tra lại link. Nó phải là một link video YouTube hợp lệ.',
            });
            return;
        }

        // Standardize the URL before saving
        const standardizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const songData = {
            title: formData.title,
            artist: formData.artist || null,
            youtube_url: standardizedUrl,
        };

        try {
            if (editingSong) {
                // Update
                const { error } = await supabase.from('songs').update(songData).eq('id', editingSong.id);
                if (error) throw error;
                toast.success('Cập nhật bài hát thành công!');
            } else {
                // Insert
                const { error } = await supabase.from('songs').insert([songData]);
                if (error) throw error;
                toast.success('Thêm bài hát mới thành công!');
            }
            fetchSongs(); // Refresh the list
            setIsDialogOpen(false); // Close dialog
        } catch (error: any) {
            toast.error(editingSong ? 'Lỗi cập nhật bài hát:' : 'Lỗi thêm bài hát:', {
                description: error.code === '23505' ? 'Link YouTube này đã tồn tại trong danh sách.' : error.message,
            });
        }
    };
    
    const handleDelete = async (songId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài hát này không?')) return;

        try {
            const { error } = await supabase.from('songs').delete().eq('id', songId);
            if (error) throw error;
            toast.success('Đã xóa bài hát.');
            fetchSongs(); // Refresh the list
        } catch (error: any) {
            toast.error('Lỗi xóa bài hát:', { description: error.message });
        }
    };

    if (profile && profile.role !== 'admin') {
        return <div className="text-center p-8 text-destructive">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <Music4 className="w-8 h-8" />
                    Quản lý Âm nhạc
                </h1>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Thêm bài hát
                </Button>
            </header>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingSong ? 'Chỉnh sửa bài hát' : 'Thêm bài hát mới'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <Input
                            id="title"
                            placeholder="Tên bài hát"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        <Input
                            id="artist"
                            placeholder="Nghệ sĩ"
                            value={formData.artist}
                            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                        />
                        <Input
                            id="youtube_url"
                            placeholder="Dán link YouTube vào đây"
                            value={rawYoutubeUrl}
                            onChange={(e) => setRawYoutubeUrl(e.target.value)}
                            required
                        />
                         <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Hủy</Button>
                            </DialogClose>
                            <Button type="submit">Lưu</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Tên bài hát</TableHead>
                                <TableHead className="w-[30%]">Nghệ sĩ</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {songs.length > 0 ? songs.map((song) => (
                                <TableRow key={song.id}>
                                    <TableCell className="font-medium">{song.title}</TableCell>
                                    <TableCell>{song.artist || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleOpenDialog(song)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(song.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Chưa có bài hát nào.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default MusicManagementPage;

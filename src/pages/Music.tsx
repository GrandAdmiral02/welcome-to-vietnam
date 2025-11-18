import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music, Play, Youtube } from "lucide-react";
import { toast } from "sonner";

// ReactPlayer đúng cách cho VITE
const ReactPlayer = lazy(() => import("react-player"));

interface Song {
    id: string;
    title: string;
    artist: string | null;
    youtube_url: string;
}

// Helper lấy YouTube ID
const getYouTubeID = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

const MusicPage = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const fetchSongs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("songs")
                .select("id, title, artist, youtube_url")
                .order("created_at", { ascending: false }); // bài mới nhất đầu
            if (error) throw error;
            setSongs(data || []);
        } catch (error: any) {
            toast.error("Không thể tải danh sách nhạc.", { description: error.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSongs();
    }, [fetchSongs]);

    useEffect(() => {
        if (songs.length > 0 && !currentSong) {
            setCurrentSong(songs[0]);
            setIsPlaying(false);
        }
    }, [songs, currentSong]);

    const handlePlaySong = (song: Song) => {
        setCurrentSong(song);
        setIsPlaying(true);
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 grid md:grid-cols-3 gap-8">
            {/* Player chính */}
            <div className="md:col-span-2">
                <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
                    <Music className="w-8 h-8" />
                    Thư giãn cùng Âm nhạc
                </h1>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative shadow-lg">
                    {currentSong ? (
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                </div>
                            }
                        >
                            <ReactPlayer
                                url={currentSong.youtube_url}
                                playing={isPlaying}
                                controls
                                width="100%"
                                height="100%"
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onError={() =>
                                    toast.error("Không thể phát video này.", {
                                        description: "Vui lòng thử bài hát khác.",
                                    })
                                }
                            />
                        </Suspense>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Youtube className="w-16 h-16 mb-4" />
                            <p>Chọn một bài hát từ danh sách để bắt đầu.</p>
                        </div>
                    )}
                </div>
                <div className="mt-4 p-4 bg-background/50 rounded-lg">
                    <h2 className="text-2xl font-bold text-primary">
                        {currentSong?.title || "Chưa có bài hát nào"}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {currentSong?.artist || "Vui lòng chọn bài hát"}
                    </p>
                </div>
            </div>

            {/* Playlist */}
            <div className="md:col-span-1 h-[calc(100vh-120px)] overflow-y-auto pr-2">
                <h3 className="text-xl font-semibold mb-3">Danh sách phát</h3>
                <div className="space-y-2">
                    {songs.length > 0 ? (
                        songs.map((song) => {
                            const videoId = getYouTubeID(song.youtube_url);
                            return (
                                <div
                                    key={song.id}
                                    className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                                        currentSong?.id === song.id
                                            ? "bg-primary/20"
                                            : "hover:bg-muted/80"
                                    }`}
                                    onClick={() => handlePlaySong(song)}
                                >
                                    {videoId ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                            alt={song.title}
                                            className="w-20 h-14 object-cover rounded-md shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-20 h-14 bg-muted flex items-center justify-center rounded-md">
                                            <Music className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate text-sm md:text-base">
                                            {song.title}
                                        </p>
                                        <p className="text-muted-foreground text-xs md:text-sm">
                                            {song.artist}
                                        </p>
                                    </div>
                                    {currentSong?.id === song.id && isPlaying && (
                                        <Play className="w-5 h-5 text-primary animate-pulse" />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-muted-foreground text-center py-10">
                            Quản trị viên chưa thêm bài hát nào.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MusicPage;

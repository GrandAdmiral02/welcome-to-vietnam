import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface YouTubePlayerProps {
    url: string;
    playing: boolean;
    onPlay: () => void;
    onPause: () => void;
    onError: (e: any) => void;
}

// Extract YouTube video ID from URL
const getYouTubeID = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
    url, 
    playing, 
    onPlay, 
    onPause, 
    onError 
}) => {
    const [Player, setPlayer] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const videoId = getYouTubeID(url);

    useEffect(() => {
        console.log("YouTubePlayer: Loading react-player...");
        import("react-player").then((mod) => {
            console.log("YouTubePlayer: react-player loaded");
            setPlayer(() => mod.default);
        }).catch((err) => {
            console.error("YouTubePlayer: Load error:", err);
            setLoadError("Không thể tải player");
            onError(err);
        });
    }, []);

    if (loadError) {
        return (
            <div className="flex items-center justify-center h-full text-destructive">
                <p>{loadError}</p>
            </div>
        );
    }

    if (!videoId) {
        console.error("YouTubePlayer: Invalid URL:", url);
        return (
            <div className="flex items-center justify-center h-full text-destructive">
                <p>URL YouTube không hợp lệ</p>
            </div>
        );
    }

    if (!Player) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    const embedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log("YouTubePlayer: Rendering", embedUrl, "Playing:", playing);
    
    return (
        <Player
            url={embedUrl}
            playing={playing}
            controls
            width="100%"
            height="100%"
            onPlay={() => {
                console.log("YouTubePlayer: onPlay");
                onPlay();
            }}
            onPause={() => {
                console.log("YouTubePlayer: onPause");
                onPause();
            }}
            onError={(e: any) => {
                console.error("YouTubePlayer: Error:", e);
                onError(e);
            }}
            onReady={() => console.log("YouTubePlayer: Ready")}
            style={{ position: 'absolute', top: 0, left: 0 }}
        />
    );
};

export default YouTubePlayer;

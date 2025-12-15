import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface YouTubePlayerProps {
    url: string;
    playing: boolean;
    onPlay: () => void;
    onPause: () => void;
    onError: (e: any) => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
    url, 
    playing, 
    onPlay, 
    onPause, 
    onError 
}) => {
    const [Player, setPlayer] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Log the URL received by the component for debugging
    console.log("YouTubePlayer received URL:", url);

    useEffect(() => {
        // Use dynamic import to load the player at runtime
        import("react-player").then((mod) => {
            setPlayer(() => mod.default);
        }).catch((err) => {
            console.error("Failed to load react-player:", err);
            setLoadError("Không thể tải trình phát video.");
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
    
    // Use the canPlay method (once the player is loaded) to check the URL
    if (Player && !Player.canPlay(url)) {
        return (
            <div className="flex items-center justify-center h-full text-destructive">
                <p>URL YouTube không hợp lệ hoặc không được hỗ trợ.</p>
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

    // Pass the URL directly to the player
    return (
        <Player
            url={url}
            playing={playing}
            controls
            width="100%"
            height="100%"
            onPlay={onPlay}
            onPause={onPause}
            onError={onError}
            style={{ position: 'absolute', top: 0, left: 0 }}
        />
    );
};

export default YouTubePlayer;

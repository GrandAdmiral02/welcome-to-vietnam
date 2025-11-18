import React from "react";
// @ts-ignore - react-player has type issues with Vite
import ReactPlayer from "react-player";

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
    const Player = ReactPlayer as any;
    
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

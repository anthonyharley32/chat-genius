import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  fileName?: string;
}

export function VideoPlayer({ src, fileName }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Force pause and reset on mount and src change
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedData = () => {
        video.pause();
        video.currentTime = 0;
      };

      // Handle initial load
      handleLoadedData();
      
      // Also handle any subsequent loads
      video.addEventListener('loadeddata', handleLoadedData);
      return () => video.removeEventListener('loadeddata', handleLoadedData);
    }
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    
    if (timeSinceLastTap < 300) {
      // Double tap detected
      toggleFullscreen();
    } else {
      // Single tap - handle play with promise
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch(error => {
                console.error('Error playing video:', error);
                setIsPlaying(false);
              });
          }
        }
      }
    }
    setLastTapTime(now);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative max-w-[min(100%,300px)]"
    >
      <div 
        className={`relative rounded-2xl overflow-hidden ${
          isFullscreen ? 'h-screen bg-black' : ''
        }`}
        onClick={handleTap}
      >
        <video
          ref={videoRef}
          src={src}
          className={`w-full bg-black ${
            isFullscreen 
              ? 'h-screen object-contain' 
              : 'max-h-[min(60vh,400px)] object-cover'
          }`}
          playsInline
          preload="metadata"
          poster={`${src}#t=0.1`}
          onEnded={handleVideoEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
        />
        
        {/* Simple play button overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-3 rounded-full bg-black/30">
              <Play className="w-6 h-6 text-white" fill="white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { Play, Pause, RotateCcw, Maximize, Minimize, Check } from 'lucide-react';
import { clsx } from 'clsx';
import ReactPlayer from 'react-player';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface CheckpointProps {
    time: number | string; // Time in seconds OR "HH:MM:SS,ms"
    children: ReactNode;
}

export const Checkpoint: React.FC<CheckpointProps> = ({ children }) => {
    return <>{children}</>;
};

interface InteractiveMediaProps {
    src: string;
    type?: 'audio' | 'video';
    title?: string;
    children?: ReactNode;
}

// Helper to parse time string "00:00:14,480" or "00:14" to seconds
const parseTime = (time: number | string): number => {
    if (typeof time === 'number') return time;

    // Replace comma with dot for standard parsing if needed, though we'll split manually
    const cleanTime = time.replace(',', '.');
    const parts = cleanTime.split(':').map(parseFloat);

    if (parts.length === 3) {
        // HH:MM:SS.ms
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS.ms
        return parts[0] * 60 + parts[1];
    }
    return parseFloat(cleanTime);
};

export const InteractiveMedia: React.FC<InteractiveMediaProps> = ({
    src,
    type = 'video',
    title,
    children
}) => {
    const playerRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [activeCheckpoint, setActiveCheckpoint] = useState<{ time: number, content: ReactNode } | null>(null);
    const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const exerciseId = generateStableExerciseId(lessonPath, 'InteractiveMedia', src);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, src, isExerciseComplete]);

    // Parse checkpoints from children
    const checkpoints = React.Children.toArray(children)
        .filter((child): child is React.ReactElement<CheckpointProps> => {
            return React.isValidElement(child) && (child.type === Checkpoint || (child.type as any).name === 'Checkpoint');
        })
        .map(child => ({
            time: parseTime(child.props.time),
            content: child.props.children
        }))
        .sort((a, b) => a.time - b.time);

    // Check completion
    useEffect(() => {
        const allCheckpointsCompleted = completedCheckpoints.size === checkpoints.length;
        if (hasEnded && allCheckpointsCompleted && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [hasEnded, completedCheckpoints, checkpoints.length, markExerciseComplete, location.pathname]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const seeking = useRef(false);

    const checkCheckpoints = (time: number) => {
        // Check for checkpoints
        const hitCheckpoint = checkpoints.find(cp =>
            time >= cp.time &&
            time < cp.time + 1 && // 1 second window to catch it
            !completedCheckpoints.has(cp.time)
        );

        if (hitCheckpoint) {
            setIsPlaying(false);
            setActiveCheckpoint(hitCheckpoint);
        }
    };

    const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
        // We only want to update time slider if we are not currently seeking
        if (seeking.current) {
            return;
        }

        const time = state.playedSeconds;
        if (!Number.isFinite(time)) return;

        setCurrentTime(time);
        checkCheckpoints(time);
    };

    const handleDuration = () => {
        const player = playerRef.current;
        if (!player) return;

        const d = player.duration;
        if (Number.isFinite(d) && d > 0) {
            setDuration(d);
        }
    };

    const handleContinue = () => {
        if (activeCheckpoint) {
            setCompletedCheckpoints(prev => new Set(prev).add(activeCheckpoint.time));
            setActiveCheckpoint(null);
            setIsPlaying(true);
        }
    };

    const handleReplay = () => {
        if (!activeCheckpoint) return;

        const currentIndex = checkpoints.findIndex(cp => cp.time === activeCheckpoint.time);
        let targetTime = 0;

        if (currentIndex > 0) {
            // Go to previous checkpoint time + 1s buffer to avoid triggering it again
            // The window for triggering is [time, time + 1)
            targetTime = checkpoints[currentIndex - 1].time + 1.1;
        }

        // Ensure we don't jump past the current checkpoint (in case segments are super short)
        if (targetTime >= activeCheckpoint.time) {
            targetTime = Math.max(0, activeCheckpoint.time - 5); // Fallback: rewind 5 seconds
        }

        const player = playerRef.current;
        if (player) {
            player.currentTime = targetTime;
        }
        setCurrentTime(targetTime);
        setActiveCheckpoint(null);
        setIsPlaying(true);
    };

    const formatTime = (time: number) => {
        if (!Number.isFinite(time) || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeekMouseDown = () => {
        seeking.current = true;
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
    };

    const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const time = parseFloat(target.value);

        seeking.current = false;

        const player = playerRef.current;
        if (player) {
            player.currentTime = time;
        }
    };

    const setPlayerRef = (player: HTMLVideoElement | HTMLAudioElement | null) => {
        playerRef.current = player;
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // ReactPlayer.canPlay might not be available on the specific import or might need different access
        // console.log('InteractiveMedia: Mounted, canPlay:', ReactPlayer.canPlay(src));
    }, [src]);

    // Imperative control for native audio element
    useEffect(() => {
        if (type === 'audio' && playerRef.current instanceof HTMLAudioElement) {
            if (isPlaying) {
                playerRef.current.play().catch((e: any) => console.error('Audio play failed:', e));
            } else {
                playerRef.current.pause();
            }
        }
    }, [isPlaying, type]);

    if (!isMounted) return <div className="p-4 text-gray-500">Loading Player...</div>;

    return (
        <div className="my-8 max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800 relative">
            {isCompleted && (
                <div className="absolute top-2 right-2 z-40 bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <Check size={20} />
                </div>
            )}
            {title && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                </div>
            )}

            <div
                ref={containerRef}
                className="group bg-black grid grid-cols-1 relative"
            >
                {/* Media Element */}
                <div className={clsx(
                    "col-start-1 row-start-1 flex items-center justify-center w-full",
                    type === 'video' ? (isFullscreen ? "h-screen" : "min-h-[300px]") : "min-h-[120px] bg-gray-900"
                )}>
                    {type === 'audio' ? (
                        <audio
                            ref={playerRef}
                            src={src}
                            controls={false}
                            className="w-full px-4"
                            onTimeUpdate={(e) => {
                                const time = e.currentTarget.currentTime;
                                setCurrentTime(time);
                                checkCheckpoints(time);
                                handleProgress({ played: time / (duration || 1), playedSeconds: time, loaded: 0, loadedSeconds: 0 });
                            }}
                            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                            onEnded={() => {
                                setIsPlaying(false);
                                setHasEnded(true);
                            }}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />
                    ) : (
                        <ReactPlayer
                            key={src} // Force remount on src change
                            ref={setPlayerRef}
                            src={src}
                            playing={isPlaying}
                            controls={false}
                            width="100%"
                            height="100%"
                            className="react-player"
                            onProgress={handleProgress as any}
                            onDurationChange={handleDuration}
                            // @ts-ignore - onTimeUpdate is passed to native video element
                            onTimeUpdate={(e) => {
                                if (!seeking.current && e.target && typeof (e.target as any).currentTime === 'number') {
                                    const time = (e.target as any).currentTime;
                                    setCurrentTime(time);
                                    checkCheckpoints(time);
                                }
                            }}
                            onEnded={() => {
                                setIsPlaying(false);
                                setHasEnded(true);
                            }}
                            onReady={() => { }}
                            onError={(e) => console.error('InteractiveMedia: Player Error', e)}
                            onStart={() => { }}
                            config={{
                                youtube: {
                                    playerVars: {
                                        showinfo: 0,
                                        controls: 0,
                                        modestbranding: 1,
                                        rel: 0,
                                        iv_load_policy: 3,
                                        fs: 0,
                                        origin: typeof window !== 'undefined' ? window.location.origin : undefined
                                    }
                                } as any
                            }}
                        />
                    )}
                </div>

                {/* Big Play Button Overlay (Video Only) */}
                {!isPlaying && !activeCheckpoint && type === 'video' && (
                    <div
                        className="col-start-1 row-start-1 z-20 flex items-center justify-center bg-black/30 cursor-pointer"
                        onClick={togglePlay}
                    >
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                            <Play size={32} className="text-white fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Custom Controls Overlay */}
                <div className={clsx(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-2 z-30",
                    activeCheckpoint ? "opacity-0 pointer-events-none" : (type === 'audio' ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                )}>
                    {/* Seek Slider Container */}
                    <div className="relative w-full h-4 flex items-center group/slider">
                        {/* Checkpoint Markers */}
                        {checkpoints.map((cp, idx) => {
                            const percent = (cp.time / (duration || 1)) * 100;
                            const isCompleted = completedCheckpoints.has(cp.time);
                            return (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-black z-20 transition-all duration-300",
                                        isCompleted ? "bg-green-500 scale-100" : "bg-yellow-400 scale-100 group-hover/slider:scale-125"
                                    )}
                                    style={{ left: `${percent}%` }}
                                    title={`Checkpoint at ${formatTime(cp.time)}`}
                                />
                            );
                        })}

                        {/* Slider */}
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeekChange}
                            className="absolute inset-0 w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all z-10"
                            onMouseDown={handleSeekMouseDown}
                            onMouseUp={handleSeekMouseUp}
                            onTouchStart={handleSeekMouseDown}
                            onTouchEnd={handleSeekMouseUp}
                        />
                    </div>

                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="hover:text-blue-400 transition-colors p-1">
                                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                            </button>
                            <span className="text-sm font-mono font-medium opacity-90">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => {
                                const player = playerRef.current;
                                if (player) {
                                    player.currentTime = 0;
                                    setCurrentTime(0);
                                }
                            }} className="hover:text-blue-400 transition-colors p-1" title="Restart">
                                <RotateCcw size={20} />
                            </button>

                            {type === 'video' && (
                                <button
                                    onClick={toggleFullscreen}
                                    className="hover:text-blue-400 transition-colors p-1"
                                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overlay for Checkpoint */}
                {activeCheckpoint && (
                    <div className="col-start-1 row-start-1 z-40 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="w-full max-w-xl p-4 my-auto">
                            <div className="mb-6 text-gray-900 dark:text-gray-100">
                                {activeCheckpoint.content}
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleReplay}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={18} />
                                    <span>Replay</span>
                                </button>
                                <button
                                    onClick={handleContinue}
                                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                >
                                    <span>Continue</span>
                                    <Play size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

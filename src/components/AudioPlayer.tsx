'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

interface AudioTrack {
  id: string;
  title: string;
  author: string;
  chapter?: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
}

interface AudioContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  sleepTimer: number | null;
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  skipForward: () => void;
  skipBackward: () => void;
}

const AudioContext = createContext<AudioContextType>({
  currentTrack: null, isPlaying: false, currentTime: 0, duration: 0,
  volume: 1, playbackRate: 1, sleepTimer: null,
  play: () => {}, pause: () => {}, resume: () => {}, seek: () => {},
  setVolume: () => {}, setPlaybackRate: () => {}, setSleepTimer: () => {},
  skipForward: () => {}, skipBackward: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration || 0));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
      // A pending sleep timer outlives the provider otherwise — it fires after
      // unmount against a null audioRef and never leaves the timer queue.
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
  }, []);

  const updateMediaSession = useCallback((track: AudioTrack) => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author,
      album: track.chapter || 'ANYFREEBOOK',
      artwork: track.coverUrl
        ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/png' }]
        : [],
    });
    // Safari rejects action handlers it doesn't implement (notably 'seekto')
    // with a NotSupportedError. An uncaught throw here would abort the rest
    // of the media-session setup, so every handler is registered defensively.
    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    };
    setHandler('play', () => { audioRef.current?.play().catch(() => {}); });
    setHandler('pause', () => audioRef.current?.pause());
    setHandler('seekbackward', () => {
      if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
    });
    setHandler('seekforward', () => {
      if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 30);
    });
    setHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime != null) audioRef.current.currentTime = details.seekTime;
    });
  }, []);

  const play = useCallback((track: AudioTrack) => {
    if (!audioRef.current) return;
    audioRef.current.src = track.audioUrl;
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.play().catch(() => {});
    setCurrentTrack(track);
    updateMediaSession(track);
  }, [volume, playbackRate, updateMediaSession]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => audioRef.current?.play().catch(() => {}), []);
  const seek = useCallback((time: number) => { if (audioRef.current) audioRef.current.currentTime = time; }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 30);
  }, []);

  const skipBackward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepTimerState(minutes);
    if (minutes) {
      sleepTimerRef.current = setTimeout(() => {
        audioRef.current?.pause();
        setSleepTimerState(null);
      }, minutes * 60 * 1000);
    }
  }, []);

  return (
    <AudioContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, playbackRate, sleepTimer,
      play, pause, resume, seek, setVolume, setPlaybackRate, setSleepTimer, skipForward, skipBackward,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPlayerBar() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    pause, resume, seek, skipForward, skipBackward,
    playbackRate, setPlaybackRate, sleepTimer, setSleepTimer,
  } = useAudio();

  const [showSleepMenu, setShowSleepMenu] = useState(false);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    // --stack-1 is the shared bottom offset that clears the mobile bottom nav.
    <div className="fixed bottom-[var(--stack-1)] md:bottom-0 left-0 right-0 z-40 glass border-t border-[var(--border)] shadow-xl">
      {/* Progress bar — a real range input sits on top of the drawn bar so it
          is keyboard operable, announces its position, and still seeks on
          click / drag / touch. Disabled until the track has a duration. */}
      <div className="relative h-1 bg-[var(--bg-secondary)] group focus-within:ring-2 focus-within:ring-[var(--primary)]">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] transition-all pointer-events-none"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow" />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          onChange={e => seek(+e.target.value)}
          disabled={duration <= 0}
          aria-label="Seek position"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
        />
      </div>

      <div className="content-wrapper flex items-center gap-3 h-16">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">🎧</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{currentTrack.title}</p>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">{currentTrack.author}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button onClick={skipBackward} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" title="Back 15s">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>
            </svg>
          </button>

          <button
            onClick={isPlaying ? pause : resume}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>

          <button onClick={skipForward} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" title="Forward 30s">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/>
            </svg>
          </button>
        </div>

        {/* Time */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono min-w-[100px] justify-end">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Speed */}
        <button
          onClick={() => {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const idx = rates.indexOf(playbackRate);
            setPlaybackRate(rates[(idx + 1) % rates.length]);
          }}
          className="hidden md:flex px-2 py-1 rounded-md text-xs font-mono font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        {/* Sleep timer */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowSleepMenu(!showSleepMenu)}
            className={`p-2 rounded-lg transition-colors ${sleepTimer ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            title={sleepTimer ? `Sleep in ${sleepTimer}m` : 'Sleep timer'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          {showSleepMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-36 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden animate-slide-up">
              {[5, 15, 30, 45, 60].map(m => (
                <button
                  key={m}
                  onClick={() => { setSleepTimer(m); setShowSleepMenu(false); }}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--surface-hover)] transition-colors ${sleepTimer === m ? 'text-[var(--primary)] font-medium' : 'text-[var(--text-secondary)]'}`}
                >
                  {m} minutes
                </button>
              ))}
              <button
                onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }}
                className="w-full px-4 py-2 text-sm text-left text-[var(--text-muted)] hover:bg-[var(--surface-hover)] border-t border-[var(--border-subtle)]"
              >
                Off
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

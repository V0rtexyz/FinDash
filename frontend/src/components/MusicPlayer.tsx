import { useState, useRef, useEffect } from 'react';
import '../styles/MusicPlayer.css';

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
}

// Классическая музыка для работы (бесплатные треки)
const demoTracks: Track[] = [
  {
    id: 1,
    title: 'Spring - Vivaldi',
    artist: 'Antonio Vivaldi',
    url: 'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3',
  },
  {
    id: 2,
    title: 'Piano Moment',
    artist: 'Classical',
    url: 'https://www.bensound.com/bensound-music/bensound-pianomoment.mp3',
  },
  {
    id: 3,
    title: 'Romantic',
    artist: 'Classical Piano',
    url: 'https://www.bensound.com/bensound-music/bensound-romantic.mp3',
  },
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.3); // Тихая громкость по умолчанию
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Скрыт по умолчанию
  const [error, setError] = useState<string>('');
  
  // Таймер
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = demoTracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setError('');
    };
    const handleEnded = () => handleNext();
    const handleError = () => {
      setError('Не удалось загрузить трек');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Таймер effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        setError('');
      }
    } catch (err) {
      console.error('Ошибка воспроизведения:', err);
      setError('Не удалось воспроизвести. Попробуйте еще раз.');
      setIsPlaying(false);
    }
  };

  const handleNext = async () => {
    setCurrentTrackIndex((prev) => (prev + 1) % demoTracks.length);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await audioRef.current?.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Ошибка переключения трека:', err);
      setIsPlaying(false);
    }
  };

  const handlePrevious = async () => {
    if (currentTime > 3) {
      audioRef.current!.currentTime = 0;
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + demoTracks.length) % demoTracks.length);
      setError('');
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Ошибка переключения трека:', err);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const selectTrack = async (index: number) => {
    setCurrentTrackIndex(index);
    setShowPlaylist(false);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await audioRef.current?.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Ошибка выбора трека:', err);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimerTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        className={`music-toggle-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Скрыть плеер' : 'Показать плеер'}
      >
        {isPlaying ? '♫' : '♪'}
      </button>

      <div className={`music-player ${isMinimized ? 'minimized' : ''} ${isOpen ? 'open' : 'closed'}`}>
        <audio ref={audioRef} src={currentTrack.url} />

        {!isMinimized && (
          <>
            {/* Playlist */}
            {showPlaylist && (
              <div className="playlist">
                <div className="playlist-header">
                  <h4>Плейлист</h4>
                  <button
                    className="close-playlist"
                    onClick={() => setShowPlaylist(false)}
                    aria-label="Закрыть плейлист"
                  >
                    ✕
                  </button>
                </div>
                <div className="playlist-items">
                  {demoTracks.map((track, index) => (
                    <div
                      key={track.id}
                      className={`playlist-item ${index === currentTrackIndex ? 'active' : ''}`}
                      onClick={() => selectTrack(index)}
                    >
                      <div className="track-info">
                        <span className="track-title">{track.title}</span>
                        <span className="track-artist">{track.artist}</span>
                      </div>
                      {index === currentTrackIndex && isPlaying && (
                        <span className="playing-indicator">♪</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timer Section */}
            {showTimer && (
              <div className="timer-section">
                <div className="timer-display">
                  <span className="timer-icon">⏱️</span>
                  <span className="timer-time">{formatTimerTime(timerSeconds)}</span>
                </div>
                <div className="timer-controls">
                  <button
                    className="timer-btn"
                    onClick={toggleTimer}
                    aria-label={isTimerRunning ? 'Остановить таймер' : 'Запустить таймер'}
                  >
                    {isTimerRunning ? '⏸' : '▶'}
                  </button>
                  <button
                    className="timer-btn reset-btn"
                    onClick={resetTimer}
                    aria-label="Сбросить таймер"
                  >
                    ↻
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="progress-section">
              <input
                type="range"
                className="progress-bar"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Прогресс трека"
              />
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              {error && <div className="player-error">{error}</div>}
            </div>
          </>
        )}

        {/* Main Controls */}
        <div className="player-main">
          <div className="track-info-section">
            <div className="track-details">
              <span className="track-title">{currentTrack.title}</span>
              <span className="track-artist">{currentTrack.artist}</span>
            </div>
          </div>

          <div className="controls">
            <button
              className="control-btn"
              onClick={handlePrevious}
              aria-label="Предыдущий трек"
            >
              ⏮
            </button>
            <button
              className="control-btn play-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="control-btn"
              onClick={handleNext}
              aria-label="Следующий трек"
            >
              ⏭
            </button>
          </div>

          <div className="extra-controls">
            <div className="volume-control">
              <span className="volume-icon">{volume > 0 ? '🔊' : '🔇'}</span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                aria-label="Громкость"
              />
            </div>
            <button
              className="timer-toggle-btn"
              onClick={() => setShowTimer(!showTimer)}
              aria-label={showTimer ? 'Скрыть таймер' : 'Показать таймер'}
              title="Таймер"
            >
              ⏱
            </button>
            <button
              className="playlist-btn"
              onClick={() => setShowPlaylist(!showPlaylist)}
              aria-label="Плейлист"
            >
              ♫
            </button>
            <button
              className="minimize-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Развернуть' : 'Свернуть'}
            >
              {isMinimized ? '▲' : '▼'}
            </button>
            <button
              className="close-player-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть плеер"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


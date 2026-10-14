import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Copy, Check, RotateCcw, Volume2, Sparkles, VolumeX } from "lucide-react";
import type { Generation } from "../types";
import { getGenerationAudioUrl } from "../services/api";

interface AudioPlayerCardProps {
  generation: Generation | null;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({ generation }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-load and play when a new generation arrives
  useEffect(() => {
    if (generation && generation.status === "completed" && generation.output_filename) {
      setCurrentTime(0);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [generation?.id]);

  if (!generation) return null;

  const audioUrl = getGenerationAudioUrl(generation.id);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || generation.duration_seconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generation.input_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: 24,
        border: "1px solid var(--border-glow)",
        boxShadow: "var(--shadow-glow)",
        background: "linear-gradient(180deg, rgba(20, 27, 45, 0.9) 0%, rgba(13, 17, 28, 0.9) 100%)",
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-success">
            <Sparkles size={12} /> Ready
          </span>
          {generation.voice_name && (
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Voice: {generation.voice_name}
            </span>
          )}
          <span className="badge badge-info" style={{ textTransform: "uppercase" }}>
            {generation.language}
          </span>
        </div>

        {/* Download WAV button */}
        <a
          id="download-speech-btn"
          href={audioUrl}
          download={`speech-${generation.id.slice(0, 8)}.wav`}
          className="btn-primary"
          style={{ padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <Download size={15} /> Download WAV
        </a>
      </div>

      {/* Spoken Text Block with Copy */}
      <div style={{
        background: "rgba(10, 14, 23, 0.5)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        marginBottom: 20,
        position: "relative"
      }}>
        <p style={{
          fontSize: "0.95rem",
          lineHeight: 1.6,
          color: "var(--text-primary)",
          fontStyle: "italic",
          paddingRight: 40
        }}>
          "{generation.input_text}"
        </p>
        <button
          type="button"
          id="copy-text-btn"
          onClick={handleCopyText}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            color: copied ? "var(--success)" : "var(--text-muted)",
            cursor: "pointer",
            padding: 4
          }}
          title="Copy text"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Scrub bar */}
      <div style={{ marginBottom: 14 }}>
        <input
          id="audio-scrub-slider"
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: "100%",
            accentColor: "var(--accent-primary)",
            cursor: "pointer"
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Main Play / Pause Button */}
          <button
            type="button"
            id="main-play-audio-btn"
            onClick={togglePlay}
            className="btn-primary"
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              padding: 0,
            }}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 3 }} />}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            id="restart-audio-btn"
            onClick={handleRestart}
            className="btn-secondary"
            style={{ padding: "10px", borderRadius: "50%" }}
            title="Replay from beginning"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Volume Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={toggleMute}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer"
            }}
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            id="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{ width: 80, accentColor: "var(--accent-primary)", cursor: "pointer" }}
          />
        </div>
      </div>
    </div>
  );
};

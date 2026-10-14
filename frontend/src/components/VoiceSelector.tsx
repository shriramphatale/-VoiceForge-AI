import React, { useState } from "react";
import { Users, Play, Pause, Trash2, CheckCircle2, Clock, Music } from "lucide-react";
import type { Voice } from "../types";
import { getVoiceAudioUrl, deleteVoice } from "../services/api";

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId: string | null;
  onSelectVoice: (voice: Voice) => void;
  onVoiceDeleted: (voiceId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  onVoiceDeleted,
}) => {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const togglePlayVoice = (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voiceId) {
      audioElement?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(getVoiceAudioUrl(voiceId));
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      audio.play();
      setAudioElement(audio);
      setPlayingVoiceId(voiceId);
    }
  };

  const handleDelete = async (voiceId: string, voiceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the voice profile "${voiceName}"? All its generations will also be deleted.`)) {
      return;
    }
    try {
      setDeletingId(voiceId);
      if (playingVoiceId === voiceId) {
        audioElement?.pause();
        setPlayingVoiceId(null);
      }
      await deleteVoice(voiceId);
      onVoiceDeleted(voiceId);
    } catch (err: any) {
      alert("Failed to delete voice: " + (err.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(168, 85, 247, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-secondary)"
          }}>
            <Users size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Saved Voice Profiles</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {voices.length} profile{voices.length === 1 ? "" : "s"} ready for synthesis
            </p>
          </div>
        </div>
      </div>

      {voices.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "36px 16px",
          background: "rgba(10, 14, 23, 0.4)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border-color)"
        }}>
          <Music size={32} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
          <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No voice profiles saved yet</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            Upload or record an audio sample above to create your first voice profile.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {voices.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlaying = playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                id={`voice-card-${voice.id}`}
                onClick={() => onSelectVoice(voice)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
                  boxShadow: isSelected ? "0 0 15px rgba(99, 102, 241, 0.2)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  {/* Play audio button */}
                  <button
                    type="button"
                    id={`play-voice-btn-${voice.id}`}
                    onClick={(e) => togglePlayVoice(voice.id, e)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: isPlaying ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.08)",
                      border: "none",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s ease"
                    }}
                    title={isPlaying ? "Pause voice preview" : "Play voice preview"}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: isSelected ? "#fff" : "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {voice.name}
                      </p>
                      {isSelected && (
                        <CheckCircle2 size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: 2
                    }}>
                      {voice.duration_seconds && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {voice.duration_seconds.toFixed(1)}s
                        </span>
                      )}
                      {voice.sample_rate && (
                        <span>{Math.round(voice.sample_rate / 1000)} kHz</span>
                      )}
                      <span>{new Date(voice.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    id={`delete-voice-btn-${voice.id}`}
                    onClick={(e) => handleDelete(voice.id, voice.name, e)}
                    disabled={deletingId === voice.id}
                    className="btn-danger"
                    style={{ padding: 8, borderRadius: "50%" }}
                    title="Delete voice profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

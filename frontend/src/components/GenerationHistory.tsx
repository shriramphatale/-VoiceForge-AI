import React, { useState } from "react";
import { History, Play, Pause, Download, Trash2, Search, AlertCircle, Clock } from "lucide-react";
import type { Generation } from "../types";
import { getGenerationAudioUrl, deleteGeneration } from "../services/api";

interface GenerationHistoryProps {
  generations: Generation[];
  onSelectGeneration: (gen: Generation) => void;
  onGenerationDeleted: (id: string) => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  generations,
  onSelectGeneration,
  onGenerationDeleted,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const togglePlay = (gen: Generation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === gen.id) {
      audioElement?.pause();
      setPlayingId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(getGenerationAudioUrl(gen.id));
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play();
      setAudioElement(audio);
      setPlayingId(gen.id);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this audio generation?")) return;
    try {
      setDeletingId(id);
      if (playingId === id) {
        audioElement?.pause();
        setPlayingId(null);
      }
      await deleteGeneration(id);
      onGenerationDeleted(id);
    } catch (err: any) {
      alert("Failed to delete generation: " + (err.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredGenerations = generations.filter((g) => {
    const textMatch = g.input_text.toLowerCase().includes(searchQuery.toLowerCase());
    const voiceMatch = g.voice_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return textMatch || voiceMatch;
  });

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 16,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(16, 185, 129, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--success)"
          }}>
            <History size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Synthesis History</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {generations.length} speech generation{generations.length === 1 ? "" : "s"} logged
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: 240 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            id="search-history-input"
            type="text"
            className="input-field"
            placeholder="Search generations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 34, paddingRight: 12, paddingBottom: 8, paddingTop: 8, fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {filteredGenerations.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "36px 16px",
          background: "rgba(10, 14, 23, 0.4)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border-color)"
        }}>
          <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No speech generations found</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            {searchQuery ? "Try a different search query." : "Synthesize your first text above to see it here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
          {filteredGenerations.map((gen) => {
            const isPlaying = playingId === gen.id;
            const audioUrl = getGenerationAudioUrl(gen.id);

            return (
              <div
                key={gen.id}
                id={`history-row-${gen.id}`}
                onClick={() => onSelectGeneration(gen)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  {/* Inline Play button if audio exists */}
                  {gen.status === "completed" && (
                    <button
                      type="button"
                      id={`play-history-btn-${gen.id}`}
                      onClick={(e) => togglePlay(gen, e)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: isPlaying ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
                    </button>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-info" style={{ textTransform: "uppercase", fontSize: "0.65rem", padding: "2px 6px" }}>
                        {gen.language}
                      </span>
                      {gen.voice_name && (
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                          {gen.voice_name}
                        </span>
                      )}
                      {gen.duration_seconds && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> {gen.duration_seconds.toFixed(1)}s
                        </span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(gen.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{
                      fontSize: "0.9rem",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      "{gen.input_text}"
                    </p>

                    {gen.status === "failed" && (
                      <p style={{ fontSize: "0.75rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <AlertCircle size={12} /> {gen.error_message || "Generation failed"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {gen.status === "completed" && (
                    <a
                      id={`download-history-btn-${gen.id}`}
                      href={audioUrl}
                      download={`speech-${gen.id.slice(0, 8)}.wav`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                      title="Download WAV"
                    >
                      <Download size={14} />
                    </a>
                  )}

                  <button
                    type="button"
                    id={`delete-history-btn-${gen.id}`}
                    onClick={(e) => handleDelete(gen.id, e)}
                    disabled={deletingId === gen.id}
                    className="btn-danger"
                    style={{ padding: 6, borderRadius: "50%" }}
                    title="Delete generation"
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

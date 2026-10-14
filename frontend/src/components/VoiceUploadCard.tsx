import React, { useState, useRef } from "react";
import { Upload, Mic, Square, Check, AlertCircle, FileAudio, Play, Pause } from "lucide-react";
import { uploadVoice } from "../services/api";
import type { Voice } from "../types";

interface VoiceUploadCardProps {
  onVoiceCreated: (voice: Voice) => void;
}

export const VoiceUploadCard: React.FC<VoiceUploadCardProps> = ({ onVoiceCreated }) => {
  const [voiceName, setVoiceName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    if (!voiceName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setVoiceName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Start recording from mic
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const recordedFile = new File([audioBlob], `mic-recording-${Date.now()}.wav`, {
          type: "audio/wav",
        });
        handleFileChange(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage("Could not access microphone: " + (err.message || "Permission denied"));
    }
  };

  // Stop mic recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Toggle preview playback
  const togglePlayPreview = () => {
    if (!audioRef.current || !previewUrl) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select or record a reference audio sample.");
      return;
    }
    if (!voiceName.trim()) {
      setErrorMessage("Please provide a name for this voice profile.");
      return;
    }
    if (!consentConfirmed) {
      setErrorMessage("You must confirm authorisation to clone this voice.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      const newVoice = await uploadVoice(selectedFile, voiceName.trim(), consentConfirmed);
      onVoiceCreated(newVoice);

      // Reset form
      setVoiceName("");
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setConsentConfirmed(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process voice sample.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(99, 102, 241, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-primary)"
        }}>
          <Upload size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Upload Reference Voice</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Provide 3 to 15 seconds of clean, single-speaker speech
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone / Mic Record */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: "2px dashed var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "24px 16px",
            textAlign: "center",
            background: "rgba(10, 14, 23, 0.4)",
            marginBottom: 16,
            transition: "all 0.2s ease"
          }}
        >
          <input
            id="voice-file-input"
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a,audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {isRecording ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.2)",
                border: "2px solid var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }} className="pulse-glow">
                <Mic size={24} color="var(--danger)" />
              </div>
              <p style={{ fontWeight: 600, color: "var(--danger)" }}>
                Recording Audio... {recordingSeconds}s
              </p>
              <button
                type="button"
                id="stop-record-btn"
                onClick={stopRecording}
                className="btn-danger"
              >
                <Square size={16} /> Stop Recording
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <FileAudio size={36} color="var(--accent-primary)" />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                  Drag & drop your voice file here, or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    browse files
                  </button>
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Supports WAV, MP3, FLAC, OGG, M4A (Max 25MB)
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>— OR —</span>
                <button
                  type="button"
                  id="start-record-btn"
                  onClick={startRecording}
                  className="btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                >
                  <Mic size={15} color="var(--accent-primary)" /> Record from Mic
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected File Preview */}
        {selectedFile && previewUrl && (
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                id="play-preview-btn"
                onClick={togglePlayPreview}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--accent-primary)",
                  border: "none",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                {isPlayingPreview ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
              </button>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedFile.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={previewUrl}
              onEnded={() => setIsPlayingPreview(false)}
              style={{ display: "none" }}
            />
          </div>
        )}

        {/* Voice Name Input */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="voice-name-input"
            style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}
          >
            Voice Profile Name
          </label>
          <input
            id="voice-name-input"
            className="input-field"
            type="text"
            placeholder="e.g. Sarah - Narrative Tone"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            disabled={isUploading}
          />
        </div>

        {/* Consent Checkbox */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "var(--radius-sm)",
          padding: 12,
          marginBottom: 16
        }}>
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={consentConfirmed}
            onChange={(e) => setConsentConfirmed(e.target.checked)}
            style={{ marginTop: 3, cursor: "pointer", accentColor: "var(--accent-primary)" }}
          />
          <label htmlFor="consent-checkbox" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
            I confirm that I own or have permission to use and clone this voice sample for AI speech synthesis.
          </label>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--danger)",
            fontSize: "0.85rem",
            marginBottom: 14
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          id="upload-voice-btn"
          type="submit"
          className="btn-primary"
          style={{ width: "100%" }}
          disabled={isUploading || !selectedFile || !voiceName.trim() || !consentConfirmed}
        >
          {isUploading ? (
            <>Validating & Saving Voice Profile...</>
          ) : (
            <>
              <Check size={18} /> Save & Enable Voice Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
};

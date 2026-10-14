import React, { useState } from "react";
import { Sparkles, Languages, Volume2, AlertCircle, Wand2 } from "lucide-react";
import type { Voice, Generation } from "../types";
import { generateSpeech } from "../services/api";

interface SpeechGeneratorProps {
  selectedVoice: Voice | null;
  onGenerationCreated: (gen: Generation) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "cs", name: "Czech (Čeština)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "zh-cn", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "hu", name: "Hungarian (Magyar)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
];

const SAMPLE_PROMPTS = [
  "Welcome back everyone. Today we are exploring the frontiers of artificial intelligence and local neural voice synthesis.",
  "In a quiet forest at dawn, the gentle mist drifted between ancient pines, carrying the whisper of ancient legends.",
  "Hello! I am your AI assistant, running completely locally on your hardware with zero cloud dependencies.",
  "Please remember to review the release notes carefully before upgrading your system components.",
];

export const SpeechGenerator: React.FC<SpeechGeneratorProps> = ({
  selectedVoice,
  onGenerationCreated,
}) => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePromptSelect = (prompt: string) => {
    setText(prompt);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoice) {
      setErrorMessage("Please select or upload a voice profile first.");
      return;
    }
    if (!text.trim()) {
      setErrorMessage("Please enter some text to synthesize.");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      const generation = await generateSpeech(text.trim(), selectedVoice.id, language);
      onGenerationCreated(generation);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate speech.");
    } finally {
      setIsGenerating(false);
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
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-primary)"
          }}>
            <Wand2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Synthesize Speech</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Generate new voice audio cloned from your reference sample
            </p>
          </div>
        </div>

        {/* Selected Voice Badge */}
        {selectedVoice ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: "0.8rem"
          }}>
            <Volume2 size={14} color="var(--accent-primary)" />
            <span style={{ color: "var(--text-secondary)" }}>Cloning:</span>
            <span style={{ fontWeight: 700, color: "#fff" }}>{selectedVoice.name}</span>
          </div>
        ) : (
          <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>
            No Voice Selected
          </span>
        )}
      </div>

      <form onSubmit={handleGenerate}>
        {/* Language Selection */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="language-select"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 6
            }}
          >
            <Languages size={15} color="var(--accent-primary)" /> Target Language
          </label>
          <select
            id="language-select"
            className="input-field"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isGenerating}
            style={{ cursor: "pointer" }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} style={{ background: "#111827", color: "#fff" }}>
                {lang.name} ({lang.code})
              </option>
            ))}
          </select>
        </div>

        {/* Text Input Area */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label
              htmlFor="speech-text-input"
              style={{ fontSize: "0.85rem", fontWeight: 600 }}
            >
              Text to Speak
            </label>
            <span style={{ fontSize: "0.75rem", color: text.length > 4500 ? "var(--warning)" : "var(--text-muted)" }}>
              {text.length} / 5,000 characters
            </span>
          </div>
          <textarea
            id="speech-text-input"
            className="input-field"
            rows={5}
            placeholder="Type or paste the words you want the cloned voice to say..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            disabled={isGenerating}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Sample Prompt Pills */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
            Quick prompt suggestions:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptSelect(prompt)}
                disabled={isGenerating}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }}
              >
                "{prompt.slice(0, 32)}..."
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
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

        {/* Generate Button with Wave Effect */}
        <button
          id="generate-speech-btn"
          type="submit"
          className="btn-primary"
          style={{ width: "100%", padding: "14px 20px", fontSize: "1rem" }}
          disabled={isGenerating || !selectedVoice || !text.trim()}
        >
          {isGenerating ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "inline-flex", alignItems: "center", height: 16 }}>
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
              </div>
              <span>Synthesizing Voice with XTTS-v2...</span>
            </div>
          ) : (
            <>
              <Sparkles size={18} /> Generate Cloned Speech
            </>
          )}
        </button>

        {isGenerating && (
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
            Running XTTS-v2 neural conditioning on your local hardware. Longer passages may take a few seconds.
          </p>
        )}
      </form>
    </div>
  );
};

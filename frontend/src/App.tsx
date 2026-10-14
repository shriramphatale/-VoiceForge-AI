import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { VoiceUploadCard } from "./components/VoiceUploadCard";
import { VoiceSelector } from "./components/VoiceSelector";
import { SpeechGenerator } from "./components/SpeechGenerator";
import { AudioPlayerCard } from "./components/AudioPlayerCard";
import { GenerationHistory } from "./components/GenerationHistory";
import { fetchVoices, fetchHistory, fetchHealth } from "./services/api";
import type { Voice, Generation, SystemHealth } from "./types";

export const App: React.FC = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // Load initial data
  useEffect(() => {
    loadHealth();
    loadVoices();
    loadHistory();

    // Periodic health check every 15 seconds
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const data = await fetchHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: "unreachable",
        backend: "offline",
      });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const loadVoices = async () => {
    try {
      const data = await fetchVoices();
      setVoices(data);
      if (data.length > 0 && !selectedVoice) {
        setSelectedVoice(data[0]);
      }
    } catch (err) {
      console.error("Failed to load voices:", err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetchHistory(1, 30);
      setGenerations(res.generations);
      if (res.generations.length > 0 && !currentGeneration) {
        const latestCompleted = res.generations.find((g) => g.status === "completed");
        if (latestCompleted) {
          setCurrentGeneration(latestCompleted);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const handleVoiceCreated = (newVoice: Voice) => {
    setVoices((prev) => [newVoice, ...prev]);
    setSelectedVoice(newVoice);
  };

  const handleVoiceDeleted = (deletedId: string) => {
    setVoices((prev) => prev.filter((v) => v.id !== deletedId));
    if (selectedVoice?.id === deletedId) {
      setSelectedVoice(voices.find((v) => v.id !== deletedId) || null);
    }
    // Also remove from history
    setGenerations((prev) => prev.filter((g) => g.voice_id !== deletedId));
    if (currentGeneration?.voice_id === deletedId) {
      setCurrentGeneration(null);
    }
  };

  const handleGenerationCreated = (newGen: Generation) => {
    setGenerations((prev) => [newGen, ...prev]);
    setCurrentGeneration(newGen);
  };

  const handleGenerationDeleted = (deletedId: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== deletedId));
    if (currentGeneration?.id === deletedId) {
      setCurrentGeneration(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        health={health}
        onRefreshHealth={loadHealth}
        isLoadingHealth={isLoadingHealth}
      />

      <main style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "32px 24px",
        width: "100%",
        flex: 1
      }}>
        {/* Main 2-Column Responsive Layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 28,
          alignItems: "start"
        }}>
          {/* Left Column: Voice Profiles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <VoiceUploadCard onVoiceCreated={handleVoiceCreated} />
            <VoiceSelector
              voices={voices}
              selectedVoiceId={selectedVoice?.id || null}
              onSelectVoice={(voice) => setSelectedVoice(voice)}
              onVoiceDeleted={handleVoiceDeleted}
            />
          </div>

          {/* Right Column: Generation, Audio Player & History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <SpeechGenerator
              selectedVoice={selectedVoice}
              onGenerationCreated={handleGenerationCreated}
            />

            {currentGeneration && (
              <AudioPlayerCard generation={currentGeneration} />
            )}

            <GenerationHistory
              generations={generations}
              onSelectGeneration={(gen) => setCurrentGeneration(gen)}
              onGenerationDeleted={handleGenerationDeleted}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border-color)",
        padding: "20px 32px",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "var(--text-muted)",
        background: "rgba(10, 13, 20, 0.6)"
      }}>
        VoiceForge AI — Local XTTS-v2 Voice Cloning & Synthesis Engine. No cloud APIs. Privacy by design.
      </footer>
    </div>
  );
};

export default App;

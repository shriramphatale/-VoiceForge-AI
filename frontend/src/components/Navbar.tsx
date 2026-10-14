import React from "react";
import { Mic, Activity, Cpu, Sparkles, RefreshCw } from "lucide-react";
import type { SystemHealth } from "../types";

interface NavbarProps {
  health: SystemHealth | null;
  onRefreshHealth: () => void;
  isLoadingHealth: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onRefreshHealth,
  isLoadingHealth,
}) => {
  const isPythonReady = health?.pythonService?.model_loaded;
  const device = health?.pythonService?.device || "detecting...";

  return (
    <header style={{
      borderBottom: "1px solid var(--border-color)",
      background: "rgba(10, 13, 20, 0.8)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      padding: "16px 32px"
    }}>
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap"
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--accent-gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)"
          }}>
            <Mic size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                VoiceForge <span className="text-gradient">AI</span>
              </h1>
              <span className="badge badge-info" style={{ fontSize: "0.65rem" }}>
                XTTS-v2 Local
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Zero-Shot Voice Cloning & Text-to-Speech Engine
            </p>
          </div>
        </div>

        {/* System Health Indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Backend Status */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-color)",
            borderRadius: 20,
            padding: "6px 12px",
            fontSize: "0.8rem"
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: health?.backend === "online" ? "var(--success)" : "var(--danger)"
            }} />
            <span style={{ color: "var(--text-secondary)" }}>API Server</span>
          </div>

          {/* Model Status */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-color)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: "0.8rem"
          }}>
            <Cpu size={14} color="var(--accent-primary)" />
            <span style={{ color: "var(--text-secondary)" }}>XTTS-v2:</span>
            <span style={{
              fontWeight: 600,
              color: isPythonReady ? "var(--success)" : "var(--warning)"
            }}>
              {isPythonReady ? `Ready (${device.toUpperCase()})` : "Offline / Initializing"}
            </span>
          </div>

          <button
            id="refresh-health-btn"
            onClick={onRefreshHealth}
            className="btn-secondary"
            title="Refresh engine status"
            style={{ padding: "8px 12px" }}
          >
            <RefreshCw size={14} className={isLoadingHealth ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </header>
  );
};

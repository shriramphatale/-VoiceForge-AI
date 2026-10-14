import type { Voice, Generation, SystemHealth, HistoryResponse, DashboardStats } from "../types";

const BASE_URL = "/api";

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${BASE_URL}/voices`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to load voices");
  return data.data;
}

export async function uploadVoice(
  file: File,
  name: string,
  consentConfirmed: boolean,
): Promise<Voice> {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("name", name);
  formData.append("consentConfirmed", consentConfirmed ? "true" : "false");

  const res = await fetch(`${BASE_URL}/voices`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to upload voice");
  return data.data;
}

export async function deleteVoice(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/voices/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to delete voice");
}

export function getVoiceAudioUrl(id: string): string {
  return `${BASE_URL}/voices/${id}/audio`;
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  language: string = "en",
): Promise<Generation> {
  const res = await fetch(`${BASE_URL}/speech/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, language }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Speech generation failed");
  return data.data;
}

export async function fetchHistory(
  page: number = 1,
  limit: number = 20,
): Promise<HistoryResponse> {
  const res = await fetch(`${BASE_URL}/speech/history?page=${page}&limit=${limit}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch history");
  return data.data;
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE_URL}/speech/stats`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch stats");
  return data.data;
}

export async function deleteGeneration(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/speech/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to delete generation");
}

export function getGenerationAudioUrl(id: string): string {
  return `${BASE_URL}/speech/${id}/audio`;
}

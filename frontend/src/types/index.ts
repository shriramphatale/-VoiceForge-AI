export interface Voice {
  id: string;
  name: string;
  original_filename: string;
  stored_audio_filename: string;
  normalized_audio_filename: string | null;
  duration_seconds: number | null;
  sample_rate: number | null;
  channels: number | null;
  consent_confirmed: number;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  voice_id: string;
  input_text: string;
  language: string;
  status: "pending" | "completed" | "failed";
  output_filename: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  voice_name?: string;
}

export interface SystemHealth {
  status: string;
  backend: string;
  pythonService?: {
    status: string;
    model_loaded: boolean;
    device: string;
    supported_languages: string[];
  };
}

export interface HistoryResponse {
  generations: Generation[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  totalVoices: number;
  totalGenerations: number;
  recentGenerations: Generation[];
}

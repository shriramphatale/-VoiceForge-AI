/**
 * Thin HTTP client for the Python FastAPI inference service.
 *
 * Every method translates network / timeout errors into AppError instances
 * so the calling controller gets a usable HTTP status + message.
 */

import axios, { type AxiosInstance } from "axios";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middleware/error.middleware.js";

interface PythonHealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  supported_languages: string[];
}

interface PythonValidateResponse {
  valid: boolean;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  error: string;
}

interface PythonGenerateResponse {
  success: boolean;
  output_filename: string;
  duration_seconds: number;
  error: string;
}

class InferenceService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.pythonServiceUrl,
      timeout: 10_000, // default; overridden per-call where needed
    });
  }

  async healthCheck(): Promise<PythonHealthResponse> {
    try {
      const { data } = await this.client.get<PythonHealthResponse>("/health", {
        timeout: 5_000,
      });
      return data;
    } catch (err) {
      logger.warn("Python service health check failed: %s", (err as Error).message);
      return {
        status: "unreachable",
        model_loaded: false,
        device: "unknown",
        supported_languages: [],
      };
    }
  }

  async validateAudio(absolutePath: string): Promise<PythonValidateResponse> {
    try {
      const { data } = await this.client.post<PythonValidateResponse>(
        "/validate-audio",
        { audio_path: absolutePath },
        { timeout: 30_000 },
      );
      return data;
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Audio validation request failed";
      throw new AppError(502, `Inference service error: ${msg}`);
    }
  }

  async generateSpeech(
    text: string,
    referenceAudioPath: string,
    language: string,
  ): Promise<PythonGenerateResponse> {
    try {
      const { data } = await this.client.post<PythonGenerateResponse>(
        "/generate",
        {
          text,
          reference_audio_path: referenceAudioPath,
          language,
        },
        { timeout: config.generationTimeoutMs },
      );
      return data;
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        throw new AppError(502, `Inference service: ${detail}`);
      }
      if (err.code === "ECONNABORTED") {
        throw new AppError(504, "Speech generation timed out. The text may be too long for the current hardware.");
      }
      if (err.code === "ECONNREFUSED") {
        throw new AppError(503, "Python inference service is not running.");
      }
      throw new AppError(502, `Inference service error: ${err.message}`);
    }
  }
}

export const inferenceService = new InferenceService();

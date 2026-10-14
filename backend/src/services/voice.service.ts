/**
 * Voice CRUD service.
 *
 * Handles database persistence, file management, and Python-service
 * integration for uploaded reference voice samples.
 */

import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { getDatabase } from "../config/database.js";
import { config } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import { inferenceService } from "./inference.service.js";
import { safeDeleteFile } from "../utils/storage.js";
import { logger } from "../utils/logger.js";

export interface VoiceRow {
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

class VoiceService {
  /** Save an uploaded voice file and its metadata after validation. */
  async create(
    file: Express.Multer.File,
    name: string,
    consentConfirmed: boolean,
  ): Promise<VoiceRow> {
    const db = getDatabase();
    const storedFilename = file.filename; // UUID-based, set by multer
    const absolutePath = path.resolve(config.voicesOriginalDir, storedFilename);

    // Ask the Python service to validate the actual audio content.
    let validation;
    try {
      validation = await inferenceService.validateAudio(absolutePath);
    } catch (err) {
      // If validation fails, remove the already-stored file.
      safeDeleteFile(absolutePath);
      throw err;
    }

    if (!validation.valid) {
      safeDeleteFile(absolutePath);
      throw new AppError(400, validation.error || "Invalid audio file");
    }

    const id = uuid();
    const now = new Date().toISOString();

    const voice: VoiceRow = {
      id,
      name,
      original_filename: file.originalname,
      stored_audio_filename: storedFilename,
      normalized_audio_filename: null,
      duration_seconds: validation.duration_seconds,
      sample_rate: validation.sample_rate,
      channels: validation.channels,
      consent_confirmed: consentConfirmed ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `INSERT INTO voices
        (id, name, original_filename, stored_audio_filename,
         normalized_audio_filename, duration_seconds, sample_rate,
         channels, consent_confirmed, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      voice.id,
      voice.name,
      voice.original_filename,
      voice.stored_audio_filename,
      voice.normalized_audio_filename,
      voice.duration_seconds,
      voice.sample_rate,
      voice.channels,
      voice.consent_confirmed,
      voice.created_at,
      voice.updated_at,
    );

    logger.info("Voice created: id=%s name=%s", id, name);
    return voice;
  }

  /** Return all voices ordered by most recent first. */
  list(): VoiceRow[] {
    return getDatabase()
      .prepare("SELECT * FROM voices ORDER BY created_at DESC")
      .all() as unknown as VoiceRow[];
  }

  /** Return a single voice or null. */
  getById(id: string): VoiceRow | null {
    return (
      (getDatabase()
        .prepare("SELECT * FROM voices WHERE id = ?")
        .get(id) as unknown as VoiceRow | undefined) ?? null
    );
  }

  /** Delete a voice, its generations, and all associated audio files. */
  delete(id: string): void {
    const db = getDatabase();
    const voice = this.getById(id);
    if (!voice) throw new AppError(404, "Voice not found");

    // Collect generation output files before CASCADE removes the rows.
    const gens = db
      .prepare("SELECT output_filename FROM generations WHERE voice_id = ?")
      .all(id) as unknown as { output_filename: string | null }[];

    for (const g of gens) {
      if (g.output_filename) {
        safeDeleteFile(path.join(config.generatedDir, g.output_filename));
      }
    }

    // Delete the voice record (CASCADE removes generation rows).
    db.prepare("DELETE FROM voices WHERE id = ?").run(id);

    // Delete voice audio files.
    safeDeleteFile(
      path.join(config.voicesOriginalDir, voice.stored_audio_filename),
    );
    if (voice.normalized_audio_filename) {
      safeDeleteFile(
        path.join(config.voicesNormalizedDir, voice.normalized_audio_filename),
      );
    }

    logger.info("Voice deleted: id=%s", id);
  }

  /**
   * Resolve the absolute path to the best available reference audio for
   * a voice (normalised copy preferred, original as fallback).
   */
  resolveAudioPath(voice: VoiceRow): string {
    if (voice.normalized_audio_filename) {
      const norm = path.resolve(
        config.voicesNormalizedDir,
        voice.normalized_audio_filename,
      );
      if (fs.existsSync(norm)) return norm;
    }
    return path.resolve(
      config.voicesOriginalDir,
      voice.stored_audio_filename,
    );
  }
}

export const voiceService = new VoiceService();

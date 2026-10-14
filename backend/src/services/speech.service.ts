/**
 * Speech generation service.
 *
 * Orchestrates: validate → create pending record → call Python → update record.
 */

import path from "path";
import { v4 as uuid } from "uuid";
import { getDatabase } from "../config/database.js";
import { config } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import { inferenceService } from "./inference.service.js";
import { voiceService } from "./voice.service.js";
import { safeDeleteFile } from "../utils/storage.js";
import { logger } from "../utils/logger.js";

export interface GenerationRow {
  id: string;
  voice_id: string;
  input_text: string;
  language: string;
  status: string;
  output_filename: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined from voices table (optional, present in list/detail queries).
  voice_name?: string;
}

class SpeechService {
  /**
   * Generate speech from text using a saved reference voice.
   *
   * 1. Validate the voice exists.
   * 2. Insert a pending generation row.
   * 3. Call the Python inference service.
   * 4. Update the row with the result.
   */
  async generate(
    text: string,
    voiceId: string,
    language: string,
  ): Promise<GenerationRow> {
    const voice = voiceService.getById(voiceId);
    if (!voice) throw new AppError(404, "Voice not found");

    const db = getDatabase();
    const id = uuid();
    const now = new Date().toISOString();

    // Insert a pending record so the UI can show progress.
    db.prepare(
      `INSERT INTO generations
         (id, voice_id, input_text, language, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    ).run(id, voiceId, text, language, now);

    const referenceAudioPath = voiceService.resolveAudioPath(voice);

    try {
      const result = await inferenceService.generateSpeech(
        text,
        referenceAudioPath,
        language,
      );

      const completedAt = new Date().toISOString();

      db.prepare(
        `UPDATE generations
            SET status           = 'completed',
                output_filename  = ?,
                duration_seconds = ?,
                completed_at     = ?
          WHERE id = ?`,
      ).run(result.output_filename, result.duration_seconds, completedAt, id);

      logger.info("Generation completed: id=%s duration=%.1fs", id, result.duration_seconds);

      return this.getById(id)!;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      db.prepare(
        `UPDATE generations
            SET status        = 'failed',
                error_message = ?,
                completed_at  = ?
          WHERE id = ?`,
      ).run(message, new Date().toISOString(), id);

      logger.error("Generation failed: id=%s error=%s", id, message);
      throw err;
    }
  }

  /** Paginated generation history (newest first). */
  getHistory(
    page: number,
    limit: number,
  ): { generations: GenerationRow[]; total: number; page: number; limit: number } {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const countRow = db.prepare("SELECT COUNT(*) AS cnt FROM generations").get() as unknown as {
      cnt: number;
    } | undefined;
    const total = countRow?.cnt ?? 0;

    const generations = db
      .prepare(
        `SELECT g.*, v.name AS voice_name
           FROM generations g
           LEFT JOIN voices v ON v.id = g.voice_id
          ORDER BY g.created_at DESC
          LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as unknown as GenerationRow[];

    return { generations, total, page, limit };
  }

  /** Return a single generation with the associated voice name. */
  getById(id: string): GenerationRow | null {
    return (
      (getDatabase()
        .prepare(
          `SELECT g.*, v.name AS voice_name
             FROM generations g
             LEFT JOIN voices v ON v.id = g.voice_id
            WHERE g.id = ?`,
        )
        .get(id) as unknown as GenerationRow | undefined) ?? null
    );
  }

  /** Delete a generation and its output audio file. */
  delete(id: string): void {
    const gen = this.getById(id);
    if (!gen) throw new AppError(404, "Generation not found");

    if (gen.output_filename) {
      safeDeleteFile(path.join(config.generatedDir, gen.output_filename));
    }

    getDatabase().prepare("DELETE FROM generations WHERE id = ?").run(id);
    logger.info("Generation deleted: id=%s", id);
  }

  /** Count helpers for the dashboard. */
  getCounts(): { totalVoices: number; totalGenerations: number } {
    const db = getDatabase();
    const vRow = db.prepare("SELECT COUNT(*) AS cnt FROM voices").get() as unknown as { cnt: number } | undefined;
    const gRow = db.prepare("SELECT COUNT(*) AS cnt FROM generations").get() as unknown as { cnt: number } | undefined;
    return {
      totalVoices: vRow?.cnt ?? 0,
      totalGenerations: gRow?.cnt ?? 0,
    };
  }
}

export const speechService = new SpeechService();

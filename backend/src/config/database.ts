import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import { config } from "./env.js";
import { logger } from "../utils/logger.js";

let db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error("Database not initialised. Call initDatabase() first.");
  }
  return db;
}

export function initDatabase(): void {
  fs.mkdirSync(config.databaseDir, { recursive: true });

  db = new DatabaseSync(config.databasePath);

  // WAL mode gives better read concurrency for a server process.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS voices (
      id                      TEXT PRIMARY KEY,
      name                    TEXT NOT NULL,
      original_filename       TEXT NOT NULL,
      stored_audio_filename   TEXT NOT NULL,
      normalized_audio_filename TEXT,
      duration_seconds        REAL,
      sample_rate             INTEGER,
      channels                INTEGER,
      consent_confirmed       INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id              TEXT PRIMARY KEY,
      voice_id        TEXT NOT NULL,
      input_text      TEXT NOT NULL,
      language        TEXT NOT NULL DEFAULT 'en',
      status          TEXT NOT NULL DEFAULT 'pending',
      output_filename TEXT,
      duration_seconds REAL,
      error_message   TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT,
      FOREIGN KEY (voice_id) REFERENCES voices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_generations_voice_id
      ON generations(voice_id);
    CREATE INDEX IF NOT EXISTS idx_generations_created_at
      ON generations(created_at);
    CREATE INDEX IF NOT EXISTS idx_generations_status
      ON generations(status);
  `);

  logger.info("Database initialised at %s", config.databasePath);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info("Database connection closed");
  }
}

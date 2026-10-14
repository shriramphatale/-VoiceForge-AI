/**
 * Local-filesystem helpers.
 *
 * All public functions operate within the configured DATA_DIR and never
 * accept user-supplied absolute paths.
 */

import fs from "fs";
import path from "path";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

/** Create every data sub-directory on startup. */
export function ensureDataDirectories(): void {
  const dirs = [
    config.voicesOriginalDir,
    config.voicesNormalizedDir,
    config.generatedDir,
    config.databaseDir,
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  logger.info("Data directories ready at %s", config.dataDir);
}

/** Safely delete a file inside one of the known data directories. */
export function safeDeleteFile(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const dataResolved = path.resolve(config.dataDir);

  if (!resolved.startsWith(dataResolved)) {
    logger.warn("Refused to delete file outside data dir: %s", resolved);
    return false;
  }

  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return true;
    }
  } catch (err) {
    logger.error("Failed to delete %s: %s", resolved, err);
  }
  return false;
}

/** Check whether a file exists. */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

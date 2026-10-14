import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createVoiceBodySchema } from "../validators/voice.schema.js";
import { voiceService } from "../services/voice.service.js";
import { config } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";

export async function createVoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, "No audio file uploaded");
    }

    const body = createVoiceBodySchema.parse(req.body);
    const voice = await voiceService.create(
      req.file,
      body.name,
      body.consentConfirmed as boolean,
    );

    res.status(201).json({ success: true, data: voice });
  } catch (err) {
    // If an error occurs after multer saved the file, clean up.
    if (req.file) {
      const filePath = path.join(config.voicesOriginalDir, req.file.filename);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* best-effort */ }
    }
    next(err);
  }
}

export function listVoices(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const voices = voiceService.list();
    res.json({ success: true, data: voices });
  } catch (err) {
    next(err);
  }
}

export function getVoice(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    const voice = voiceService.getById(id);
    if (!voice) throw new AppError(404, "Voice not found");
    res.json({ success: true, data: voice });
  } catch (err) {
    next(err);
  }
}

export function deleteVoice(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    voiceService.delete(id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

/** Stream the voice audio file with the correct content-type. */
export function getVoiceAudio(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    const voice = voiceService.getById(id);
    if (!voice) throw new AppError(404, "Voice not found");

    const filePath = path.resolve(
      config.voicesOriginalDir,
      voice.stored_audio_filename,
    );

    if (!fs.existsSync(filePath)) {
      throw new AppError(404, "Audio file not found on disk");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".flac": "audio/flac",
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",
    };

    res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { generateSpeechSchema, historyQuerySchema } from "../validators/speech.schema.js";
import { speechService } from "../services/speech.service.js";
import { config } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";

export async function generateSpeech(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = generateSpeechSchema.parse(req.body);
    const generation = await speechService.generate(
      body.text,
      body.voiceId,
      body.language,
    );
    res.status(201).json({ success: true, data: generation });
  } catch (err) {
    next(err);
  }
}

export function getHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const query = historyQuerySchema.parse(req.query);
    const result = speechService.getHistory(query.page, query.limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export function getGeneration(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    const gen = speechService.getById(id);
    if (!gen) throw new AppError(404, "Generation not found");
    res.json({ success: true, data: gen });
  } catch (err) {
    next(err);
  }
}

export function getGenerationAudio(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    const gen = speechService.getById(id);
    if (!gen) throw new AppError(404, "Generation not found");
    if (!gen.output_filename) throw new AppError(404, "No audio file available");

    const filePath = path.resolve(config.generatedDir, gen.output_filename);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, "Audio file not found on disk");
    }

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="generated-${gen.id.slice(0, 8)}.wav"`,
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

export function deleteGeneration(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const id = req.params.id as string;
    speechService.delete(id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const counts = speechService.getCounts();
    const recent = speechService.getHistory(1, 5);
    res.json({
      success: true,
      data: {
        totalVoices: counts.totalVoices,
        totalGenerations: counts.totalGenerations,
        recentGenerations: recent.generations,
      },
    });
  } catch (err) {
    next(err);
  }
}

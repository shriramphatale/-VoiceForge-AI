import { z } from "zod";
import { config } from "../config/env.js";

export const generateSpeechSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(config.maxTextLength, `Text must be ${config.maxTextLength} characters or fewer`)
    .trim(),
  voiceId: z.string().uuid("Invalid voice ID"),
  language: z
    .string()
    .min(2)
    .max(10)
    .default("en"),
});

export type GenerateSpeechBody = z.infer<typeof generateSpeechSchema>;

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { logger } from "../utils/logger.js";

/** Custom application error with an HTTP status code. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Centralised Express error handler – must have four params. */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Zod validation errors.
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => e.message).join("; ");
    res.status(400).json({ success: false, error: messages });
    return;
  }

  // Multer errors (file too large, wrong type, etc.).
  if (err instanceof MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ success: false, error: err.message });
    return;
  }

  // Unexpected errors – log the stack but return a generic message.
  logger.error("Unhandled error: %s", err.stack || err.message);
  res.status(500).json({ success: false, error: "Internal server error" });
}

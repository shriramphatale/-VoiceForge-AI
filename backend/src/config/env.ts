import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000",
  dataDir: path.resolve(process.env.DATA_DIR || "../data"),
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "25", 10),
  maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || "5000", 10),
  generationTimeoutMs: parseInt(
    process.env.GENERATION_TIMEOUT_MS || "300000",
    10,
  ),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  get voicesOriginalDir(): string {
    return path.join(this.dataDir, "voices", "originals");
  },
  get voicesNormalizedDir(): string {
    return path.join(this.dataDir, "voices", "normalized");
  },
  get generatedDir(): string {
    return path.join(this.dataDir, "generated");
  },
  get databaseDir(): string {
    return path.join(this.dataDir, "database");
  },
  get databasePath(): string {
    return path.join(this.databaseDir, "app.db");
  },
} as const;

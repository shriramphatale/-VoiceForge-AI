import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import { config } from "../config/env.js";

const ALLOWED_EXTENSIONS = new Set([".wav", ".mp3", ".flac", ".ogg", ".m4a"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.voicesOriginalDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported audio format "${ext}". Accepted: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      ),
    );
  }
}

export const uploadVoice = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 1,
  },
});

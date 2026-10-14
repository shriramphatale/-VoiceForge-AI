import { Router } from "express";
import {
  createVoice,
  listVoices,
  getVoice,
  deleteVoice,
  getVoiceAudio,
} from "../controllers/voice.controller.js";
import { uploadVoice } from "../middleware/upload.middleware.js";

const router = Router();

// Accept "audio" or "file" field name
router.post(
  "/",
  (req, res, next) => {
    uploadVoice.fields([
      { name: "audio", maxCount: 1 },
      { name: "file", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return next(err);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.audio?.[0]) {
        req.file = files.audio[0];
      } else if (files?.file?.[0]) {
        req.file = files.file[0];
      }
      next();
    });
  },
  createVoice,
);

router.get("/", listVoices);
router.get("/:id", getVoice);
router.delete("/:id", deleteVoice);
router.get("/:id/audio", getVoiceAudio);

export default router;

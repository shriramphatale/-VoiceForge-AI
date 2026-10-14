import { Router } from "express";
import {
  generateSpeech,
  getHistory,
  getGeneration,
  getGenerationAudio,
  deleteGeneration,
  getDashboardStats,
} from "../controllers/speech.controller.js";

const router = Router();

router.post("/generate", generateSpeech);
router.get("/history", getHistory);
router.get("/stats", getDashboardStats);
router.get("/:id", getGeneration);
router.get("/:id/audio", getGenerationAudio);
router.delete("/:id", deleteGeneration);

export default router;

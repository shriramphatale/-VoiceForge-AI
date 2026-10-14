import { Router } from "express";
import voiceRoutes from "./voice.routes.js";
import speechRoutes from "./speech.routes.js";
import { inferenceService } from "../services/inference.service.js";

const router = Router();

router.get("/health", async (_req, res) => {
  const pythonHealth = await inferenceService.healthCheck();
  res.json({
    status: "ok",
    backend: "online",
    pythonService: pythonHealth,
  });
});

router.use("/voices", voiceRoutes);
router.use("/speech", speechRoutes);

export default router;

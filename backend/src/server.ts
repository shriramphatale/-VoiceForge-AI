import app from "./app.js";
import { config } from "./config/env.js";
import { initDatabase, closeDatabase } from "./config/database.js";
import { ensureDataDirectories } from "./utils/storage.js";
import { logger } from "./utils/logger.js";
import { inferenceService } from "./services/inference.service.js";

async function startServer() {
  try {
    // 1. Ensure storage directories exist
    ensureDataDirectories();

    // 2. Initialise SQLite database and run migrations
    initDatabase();

    // 3. Optional health-check ping to Python service (non-fatal if offline at startup)
    const pythonStatus = await inferenceService.healthCheck();
    if (pythonStatus.model_loaded) {
      logger.info(
        "Python inference service is connected and model is loaded (%s on %s)",
        pythonStatus.status,
        pythonStatus.device,
      );
    } else {
      logger.warn(
        "Python inference service is currently offline or loading. TTS requests will wait until it starts.",
      );
    }

    // 4. Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Backend API server running on port ${config.port}`);
      logger.info(`Frontend URL expected at: ${config.frontendUrl}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info("Gracefully shutting down backend server...");
      server.close(() => {
        closeDatabase();
        logger.info("Server closed successfully.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Failed to start backend server: %s", error);
    process.exit(1);
  }
}

startServer();

"""FastAPI application – XTTS-v2 inference service.

Endpoints
---------
GET  /health          – service & model status
POST /generate        – synthesise speech from text + reference audio
POST /validate-audio  – validate a reference audio file
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .audio_utils import validate_audio_file
from .config import settings
from .inference import generate_speech
from .model_manager import model_manager
from .schemas import (
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    ValidateAudioRequest,
    ValidateAudioResponse,
)

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the XTTS-v2 model at startup; log on shutdown."""
    # Ensure data directories exist.
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    settings.voices_originals_dir.mkdir(parents=True, exist_ok=True)
    settings.voices_normalized_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Starting XTTS-v2 inference service …")
    try:
        model_manager.load_model()
    except Exception:
        logger.error(
            "Model failed to load. The service will start, "
            "but /generate will return 503 until the model is available."
        )
    yield
    logger.info("Shutting down inference service.")


# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="XTTS-v2 Inference Service",
    description="Local zero-shot voice cloning inference API",
    version="1.0.0",
    lifespan=lifespan,
)

# Restrict CORS to the Node.js backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if model_manager.model_loaded else "model_not_loaded",
        model_loaded=model_manager.model_loaded,
        device=model_manager.device,
        supported_languages=model_manager.supported_languages,
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    if not model_manager.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Check the service logs for errors.",
        )

    if len(request.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds the maximum length of {settings.MAX_TEXT_LENGTH} characters.",
        )

    # Validate reference audio path.
    ref = Path(request.reference_audio_path)
    if not ref.is_absolute():
        raise HTTPException(status_code=400, detail="reference_audio_path must be absolute.")
    if not ref.exists():
        raise HTTPException(status_code=404, detail="Reference audio file not found.")

    output_dir = str(settings.generated_dir)
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    result = await generate_speech(
        text=request.text,
        reference_audio_path=str(ref),
        language=request.language,
        output_dir=output_dir,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])

    return GenerateResponse(**result)


@app.post("/validate-audio", response_model=ValidateAudioResponse)
async def validate_audio(request: ValidateAudioRequest):
    result = validate_audio_file(request.audio_path)
    return ValidateAudioResponse(**result)


# ── Direct execution ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )

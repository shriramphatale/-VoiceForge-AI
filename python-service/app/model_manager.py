"""Singleton XTTS-v2 model manager.

The model is loaded once at startup and reused for every inference request.
"""

import logging
from typing import List

import torch

from .config import settings

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages the lifecycle of the XTTS-v2 TTS model instance."""

    def __init__(self) -> None:
        self._tts = None
        self._device: str = "cpu"
        self._model_loaded: bool = False
        self._supported_languages: List[str] = []

    # ── Public properties ───────────────────────────────────────────────

    @property
    def model_loaded(self) -> bool:
        return self._model_loaded

    @property
    def device(self) -> str:
        return self._device

    @property
    def supported_languages(self) -> List[str]:
        return self._supported_languages

    @property
    def tts(self):
        """Return the underlying TTS instance (or None if not loaded)."""
        return self._tts

    # ── Device detection ────────────────────────────────────────────────

    def _detect_device(self) -> str:
        cfg = settings.XTTS_DEVICE.lower().strip()

        if cfg == "auto":
            if torch.cuda.is_available():
                name = torch.cuda.get_device_name(0)
                mem_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
                logger.info("CUDA available: %s (%.1f GB)", name, mem_gb)
                return "cuda"
            logger.info("CUDA not available – using CPU (inference will be slower).")
            return "cpu"

        if cfg == "cuda":
            if not torch.cuda.is_available():
                logger.warning("CUDA requested but unavailable – falling back to CPU.")
                return "cpu"
            return "cuda"

        return "cpu"

    # ── Model loading ───────────────────────────────────────────────────

    def load_model(self) -> None:
        """Download (first run) and load XTTS-v2.  Call once at startup."""
        logger.info("Loading XTTS-v2 model …")
        self._device = self._detect_device()

        try:
            import os
            os.environ["COQUI_TOS_AGREED"] = "1"
            from TTS.api import TTS  # Heavy import – deferred on purpose

            model_name = settings.XTTS_MODEL_NAME
            use_gpu = self._device == "cuda"
            logger.info("Model : %s", model_name)
            logger.info("Device: %s", self._device)

            # If the user configured a custom model directory, set the
            # environment variable that Coqui TTS reads for its cache.
            if settings.XTTS_MODEL_DIR:
                import os
                os.environ["TTS_HOME"] = settings.XTTS_MODEL_DIR

            self._tts = TTS(model_name=model_name, gpu=use_gpu)

            # Attempt to read the language list from the loaded model.
            try:
                if hasattr(self._tts, "languages") and self._tts.languages:
                    self._supported_languages = list(self._tts.languages)
                elif (
                    hasattr(self._tts, "synthesizer")
                    and hasattr(self._tts.synthesizer, "tts_model")
                    and hasattr(self._tts.synthesizer.tts_model, "language_manager")
                    and self._tts.synthesizer.tts_model.language_manager is not None
                ):
                    lm = self._tts.synthesizer.tts_model.language_manager
                    if hasattr(lm, "language_names"):
                        self._supported_languages = list(lm.language_names)
            except Exception:
                pass

            # Fallback to the known XTTS-v2 language list.
            if not self._supported_languages:
                self._supported_languages = [
                    "en", "es", "fr", "de", "it", "pt", "pl", "tr",
                    "ru", "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi",
                ]

            self._model_loaded = True
            logger.info("XTTS-v2 loaded successfully on %s", self._device)
            logger.info("Supported languages: %s", ", ".join(self._supported_languages))

        except Exception:
            self._model_loaded = False
            logger.exception("Failed to load XTTS-v2 model")
            raise


# Module-level singleton
model_manager = ModelManager()

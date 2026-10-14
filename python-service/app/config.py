"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralised settings – every value has a sensible default so the
    service can start without a .env file (model download still needs
    internet on the first run)."""

    XTTS_MODEL_NAME: str = os.getenv(
        "XTTS_MODEL_NAME",
        "tts_models/multilingual/multi-dataset/xtts_v2",
    )
    XTTS_DEVICE: str = os.getenv("XTTS_DEVICE", "auto")
    XTTS_MODEL_DIR: str = os.getenv("XTTS_MODEL_DIR", "")
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "5000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DATA_DIR: str = os.getenv("DATA_DIR", "../data")

    @property
    def data_path(self) -> Path:
        return Path(self.DATA_DIR).resolve()

    @property
    def generated_dir(self) -> Path:
        return self.data_path / "generated"

    @property
    def voices_originals_dir(self) -> Path:
        return self.data_path / "voices" / "originals"

    @property
    def voices_normalized_dir(self) -> Path:
        return self.data_path / "voices" / "normalized"


settings = Settings()

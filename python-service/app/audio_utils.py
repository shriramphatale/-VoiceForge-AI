"""Audio file validation and metadata extraction using soundfile."""

import logging
from pathlib import Path

import soundfile as sf

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
MAX_DURATION_SECONDS = 300  # 5 minutes
MIN_DURATION_SECONDS = 0.5  # Half a second


def validate_audio_file(file_path: str) -> dict:
    """Validate an audio file and return its properties.

    Returns a dict with keys: valid, duration_seconds, sample_rate, channels, error.
    """
    path = Path(file_path)

    if not path.exists():
        return {"valid": False, "error": "File does not exist",
                "duration_seconds": 0, "sample_rate": 0, "channels": 0}

    if not path.is_file():
        return {"valid": False, "error": "Path is not a file",
                "duration_seconds": 0, "sample_rate": 0, "channels": 0}

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return {
            "valid": False,
            "error": f"Unsupported format '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
            "duration_seconds": 0, "sample_rate": 0, "channels": 0,
        }

    try:
        info = sf.info(str(path))
    except Exception as exc:
        return {
            "valid": False,
            "error": (
                f"Cannot read audio file: {exc}. "
                "The file may be corrupted, empty, or not a valid audio file."
            ),
            "duration_seconds": 0, "sample_rate": 0, "channels": 0,
        }

    if info.frames == 0:
        return {"valid": False, "error": "Audio file contains 0 frames (empty).",
                "duration_seconds": 0, "sample_rate": info.samplerate, "channels": info.channels}

    if info.duration < MIN_DURATION_SECONDS:
        return {
            "valid": False,
            "error": f"Audio is too short ({info.duration:.1f}s). Minimum is {MIN_DURATION_SECONDS}s.",
            "duration_seconds": info.duration, "sample_rate": info.samplerate, "channels": info.channels,
        }

    if info.duration > MAX_DURATION_SECONDS:
        return {
            "valid": False,
            "error": f"Audio is too long ({info.duration:.1f}s). Maximum is {MAX_DURATION_SECONDS}s.",
            "duration_seconds": info.duration, "sample_rate": info.samplerate, "channels": info.channels,
        }

    return {
        "valid": True,
        "duration_seconds": round(info.duration, 2),
        "sample_rate": info.samplerate,
        "channels": info.channels,
        "error": "",
    }


def get_audio_info(file_path: str) -> dict:
    """Return duration, sample_rate, and channels for an audio file."""
    try:
        info = sf.info(str(file_path))
        return {
            "duration_seconds": round(info.duration, 2),
            "sample_rate": info.samplerate,
            "channels": info.channels,
        }
    except Exception as exc:
        logger.warning("Failed to read audio info for %s: %s", file_path, exc)
        return {"duration_seconds": 0.0, "sample_rate": 0, "channels": 0}

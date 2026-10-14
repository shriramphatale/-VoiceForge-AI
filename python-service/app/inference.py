"""XTTS-v2 inference logic.

Key design choices:
* An asyncio.Lock prevents concurrent model access – XTTS-v2 is not
  thread-safe and running two inferences simultaneously would corrupt state
  or exhaust GPU memory.
* Long text is split at sentence boundaries so that each chunk stays within
  the context window XTTS-v2 handles well (~250 chars).
* Inference runs inside ``run_in_executor`` so the FastAPI event loop is
  never blocked.
"""

import asyncio
import logging
import re
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from .audio_utils import get_audio_info
from .config import settings
from .model_manager import model_manager

logger = logging.getLogger(__name__)

_inference_lock = asyncio.Lock()

# XTTS-v2 produces best quality with chunks ≤ 250 characters.
_MAX_CHUNK_CHARS = 250


# ── Text chunking ──────────────────────────────────────────────────────────

def _split_text(text: str, max_len: int = _MAX_CHUNK_CHARS) -> list[str]:
    """Split *text* into chunks that respect sentence boundaries."""
    text = text.strip()
    if len(text) <= max_len:
        return [text]

    # First pass: split on sentence-ending punctuation.
    sentences = re.split(r"(?<=[.!?])\s+", text)

    chunks: list[str] = []
    buf = ""

    for sentence in sentences:
        # If a single sentence exceeds max_len, break on commas / spaces.
        if len(sentence) > max_len:
            if buf:
                chunks.append(buf.strip())
                buf = ""
            for part in re.split(r",\s*", sentence):
                if len(buf) + len(part) + 2 <= max_len:
                    buf = f"{buf}, {part}" if buf else part
                else:
                    if buf:
                        chunks.append(buf.strip())
                    # If even a single comma-segment is too long, hard-split.
                    while len(part) > max_len:
                        # Find the last space before max_len.
                        idx = part.rfind(" ", 0, max_len)
                        if idx == -1:
                            idx = max_len
                        chunks.append(part[:idx].strip())
                        part = part[idx:].strip()
                    buf = part
        elif len(buf) + len(sentence) + 1 <= max_len:
            buf = f"{buf} {sentence}" if buf else sentence
        else:
            if buf:
                chunks.append(buf.strip())
            buf = sentence

    if buf:
        chunks.append(buf.strip())

    return [c for c in chunks if c]


# ── Core inference ─────────────────────────────────────────────────────────

def _run_inference(
    text: str,
    reference_audio_path: str,
    language: str,
    output_path: str,
) -> None:
    """Blocking call that runs XTTS-v2 inference.  Executed in a thread pool."""
    tts = model_manager.tts
    chunks = _split_text(text)

    if len(chunks) == 1:
        with torch.no_grad():
            tts.tts_to_file(
                text=chunks[0],
                speaker_wav=reference_audio_path,
                language=language,
                file_path=output_path,
            )
        return

    # Multiple chunks → generate individually, then concatenate.
    all_audio: list[np.ndarray] = []
    sample_rate: int | None = None
    temp_files: list[str] = []

    try:
        for idx, chunk in enumerate(chunks):
            tmp = f"{output_path}.chunk{idx}.wav"
            temp_files.append(tmp)

            with torch.no_grad():
                tts.tts_to_file(
                    text=chunk,
                    speaker_wav=reference_audio_path,
                    language=language,
                    file_path=tmp,
                )

            data, sr = sf.read(tmp)
            all_audio.append(data)
            if sample_rate is None:
                sample_rate = sr

        combined = np.concatenate(all_audio)
        sf.write(output_path, combined, sample_rate)
    finally:
        for tmp in temp_files:
            try:
                Path(tmp).unlink(missing_ok=True)
            except OSError:
                pass


async def generate_speech(
    text: str,
    reference_audio_path: str,
    language: str,
    output_dir: str,
) -> dict:
    """Public async entry-point for speech generation.

    Returns a dict: ``{success, output_filename, duration_seconds, error}``.
    """
    if not model_manager.model_loaded:
        return {"success": False, "output_filename": "", "duration_seconds": 0, "error": "Model is not loaded"}

    ref = Path(reference_audio_path)
    if not ref.exists() or not ref.is_file():
        return {"success": False, "output_filename": "", "duration_seconds": 0, "error": "Reference audio file not found"}

    if language not in model_manager.supported_languages:
        return {
            "success": False,
            "output_filename": "",
            "duration_seconds": 0,
            "error": f"Unsupported language '{language}'. Supported: {', '.join(model_manager.supported_languages)}",
        }

    output_filename = f"{uuid.uuid4().hex}.wav"
    output_path = Path(output_dir) / output_filename
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        async with _inference_lock:
            logger.info(
                "Inference start – %d chars, lang=%s, ref=%s",
                len(text), language, ref.name,
            )
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                _run_inference,
                text,
                str(ref),
                language,
                str(output_path),
            )

        info = get_audio_info(str(output_path))
        logger.info("Generated %s (%.1fs)", output_filename, info["duration_seconds"])

        return {
            "success": True,
            "output_filename": output_filename,
            "duration_seconds": info["duration_seconds"],
            "error": "",
        }

    except Exception as exc:
        logger.exception("Inference failed")
        # Clean up partial file.
        try:
            output_path.unlink(missing_ok=True)
        except OSError:
            pass
        return {"success": False, "output_filename": "", "duration_seconds": 0, "error": str(exc)}

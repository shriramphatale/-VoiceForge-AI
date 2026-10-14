"""Pydantic request / response schemas for the FastAPI endpoints."""

from typing import List, Optional

from pydantic import BaseModel, Field


# ── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    supported_languages: List[str] = []


# ── Generate ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to synthesise")
    reference_audio_path: str = Field(
        ..., min_length=1, description="Absolute path to reference speaker WAV"
    )
    language: str = Field(
        default="en", min_length=2, max_length=10, description="BCP-47-style language code"
    )


class GenerateResponse(BaseModel):
    success: bool
    output_filename: str = ""
    duration_seconds: float = 0.0
    error: str = ""


# ── Validate Audio ──────────────────────────────────────────────────────────

class ValidateAudioRequest(BaseModel):
    audio_path: str = Field(..., min_length=1, description="Absolute path to audio file")


class ValidateAudioResponse(BaseModel):
    valid: bool
    duration_seconds: float = 0.0
    sample_rate: int = 0
    channels: int = 0
    error: str = ""

@echo off
title VoiceForge - Python XTTS-v2 Service
"%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

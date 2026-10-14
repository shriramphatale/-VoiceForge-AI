@echo off
title VoiceForge AI - Local Voice Cloning

set SCRIPT_DIR=%~dp0
if not exist "%SCRIPT_DIR%backend" (
    if exist "%SCRIPT_DIR%..\backend" (
        cd /d "%SCRIPT_DIR%.."
    )
) else (
    cd /d "%SCRIPT_DIR%"
)

echo ========================================================
echo        VoiceForge AI - Local Voice Cloning System
echo ========================================================
echo.

:: 1. Start Python Inference Service
echo [1/3] Starting Python XTTS-v2 Service on port 8000...
start "VoiceForge - Python XTTS-v2 Service" cmd /k "cd python-service && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Start Node.js Express Backend
echo [2/3] Starting Node.js Backend API on port 5000...
start "VoiceForge - Backend API" cmd /k "cd backend && npm run dev"

:: 3. Start Frontend Dev Server
echo [3/3] Starting React Frontend on port 5173...
start "VoiceForge - React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo All 3 services are launching in separate terminal windows:
echo - Frontend:       http://localhost:5173
echo - Backend API:    http://localhost:5000/api/health
echo - Python Service: http://localhost:8000/docs
echo ========================================================
echo.
echo Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:5173

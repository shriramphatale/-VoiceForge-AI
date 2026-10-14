# VoiceForge AI Launcher Script
param(
    [switch]$NoBrowser
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       VoiceForge AI - Local Voice Cloning System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Determine root project directory
$CurrentDir = Get-Location
$RootDir = $PSScriptRoot
if (-not $RootDir -or -not (Test-Path "$RootDir\backend")) {
    if (Test-Path "$CurrentDir\backend") {
        $RootDir = $CurrentDir.Path
    } elseif (Test-Path "$CurrentDir\..\backend") {
        $RootDir = (Resolve-Path "$CurrentDir\..").Path
    } elseif (Test-Path "$PSScriptRoot\..\backend") {
        $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
    } else {
        $RootDir = "E:\TextToSpeech"
    }
}

Write-Host "Project Root: $RootDir" -ForegroundColor Gray

# Locate Python in .venv
$PythonExe = "$RootDir\python-service\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

Write-Host "Using Python: $PythonExe" -ForegroundColor Gray
Write-Host ""

# 1. Start Python Service
Write-Host "[1/3] Starting Python XTTS-v2 Service on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$RootDir\python-service'; & '$PythonExe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Backend API
Write-Host "[2/3] Starting Node.js Backend API on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$RootDir\backend'; npm run dev"

# 3. Start Frontend
Write-Host "[3/3] Starting React Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$RootDir\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "All 3 services are launching in separate windows:" -ForegroundColor Green
Write-Host " - Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host " - Backend API:    http://localhost:5000/api/health" -ForegroundColor White
Write-Host " - Python Service: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
}

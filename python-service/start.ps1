# VoiceForge AI Launcher Script (can be run directly from python-service)
param(
    [switch]$NoBrowser
)

$ParentScript = Join-Path $PSScriptRoot "..\start.ps1"
if (Test-Path $ParentScript) {
    & $ParentScript @PSBoundParameters
} else {
    Write-Host "Please run start.ps1 from the project root." -ForegroundColor Red
}

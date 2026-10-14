@echo off
if exist "..\start.bat" (
    cd ..
    call start.bat
) else (
    echo Please run start.bat from the project root.
    pause
)

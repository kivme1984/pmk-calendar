@echo off
cd /d "%~dp0google-auth-worker"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0google-auth-worker\setup-cloudflare.ps1"
pause

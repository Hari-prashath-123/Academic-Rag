#!/usr/bin/env pwsh
<#
.SYNOPSIS
Start both FastAPI backend (port 8000) and Django admin portal (port 8001) simultaneously.

.DESCRIPTION
Activates the Python virtual environment and launches:
  - FastAPI REST API on http://127.0.0.1:8000
  - Django admin portal on http://127.0.0.1:8001

Both services run in the background. Press Ctrl+C to stop all services.

.EXAMPLE
.\start-all.ps1
#>

param(
    [switch]$Help
)

if ($Help) {
    Get-Help $PSCommandPath -Full
    exit 0
}

# Get the backend directory
$BackendDir = Split-Path -Parent $PSCommandPath
Push-Location $BackendDir

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Academic RAG Backend - Multi-Service Launcher" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start FastAPI on port 8000
Write-Host "Launching FastAPI REST API on http://127.0.0.1:8000..." -ForegroundColor Yellow
$fastApiProcess = Start-Process -NoNewWindow -FilePath "python" -ArgumentList @("manage.py", "runserver", "127.0.0.1:8000") -PassThru

# Small delay to let FastAPI start
Start-Sleep -Milliseconds 1000

# Start Django admin on port 8001
Write-Host "Launching Django Admin Portal on http://127.0.0.1:8001..." -ForegroundColor Yellow
$djangoProcess = Start-Process -NoNewWindow -FilePath "python" -ArgumentList @("django_manage.py", "runserver", "127.0.0.1:8001", "--noreload") -PassThru

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Both services started successfully." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "FastAPI REST API" -ForegroundColor Cyan
Write-Host "  URL: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  Login: http://127.0.0.1:8000/api/auth/login-page" -ForegroundColor White
Write-Host ""
Write-Host "Django Admin Portal" -ForegroundColor Cyan
Write-Host "  URL: http://127.0.0.1:8001/admin/" -ForegroundColor White
Write-Host "  Username: hari" -ForegroundColor White
Write-Host "  Password: 123" -ForegroundColor White
Write-Host ""
Write-Host "FastAPI Login Credentials" -ForegroundColor Cyan
Write-Host "  Email: admin@test.local" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services: Press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

try {
    Wait-Process -Id $fastApiProcess.Id, $djangoProcess.Id
} finally {
    if ($fastApiProcess -and -not $fastApiProcess.HasExited) {
        Stop-Process -Id $fastApiProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($djangoProcess -and -not $djangoProcess.HasExited) {
        Stop-Process -Id $djangoProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

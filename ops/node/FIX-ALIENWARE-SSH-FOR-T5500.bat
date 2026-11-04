@echo off
title Fix Alienware SSH for T5500 and Sabretooth (Admin Auto-Elevate)
echo ======================================================================
echo  ALIENWARE (.40) SSH AUTHORIZED KEYS FIX FOR T5500 (.15) ^& SABRETOOTH (.8)
echo ======================================================================

if "%~1"=="" (
  echo ERROR: Fleet key bundle path argument is required.
  echo Usage: %~nx0 ^<path-to-fleet-keys-bundle^>
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$fleetBundle = '%~1'; " ^
  "if (-not $fleetBundle -or -not (Test-Path $fleetBundle)) { Write-Error 'Fleet bundle path is missing or invalid'; exit 1 }; " ^
  "$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); " ^
  "if (-not $isAdmin) { Start-Process -FilePath '%~f0' -ArgumentList ('""' + $fleetBundle + '""') -Verb RunAs; exit }; " ^
  "$keys = @(Get-Content $fleetBundle | Where-Object { $_.Trim() -ne '' }); " ^
  "if (-not $keys -or $keys.Count -eq 0) { Write-Error 'Fleet bundle contains no keys'; exit 1 }; " ^
  "$userKeyFile = Join-Path $env:USERPROFILE '.ssh\authorized_keys'; " ^
  "$adminKeyFile = 'C:\ProgramData\ssh\administrators_authorized_keys'; " ^
  "$keys | Set-Content -Path $adminKeyFile -Encoding UTF8; " ^
  "if (Test-Path (Split-Path -Parent $userKeyFile)) { $keys | Set-Content -Path $userKeyFile -Encoding UTF8 }; " ^
  "icacls $adminKeyFile /inheritance:r | Out-Null; " ^
  "icacls $adminKeyFile /grant 'SYSTEM:(F)' | Out-Null; " ^
  "icacls $adminKeyFile /grant 'Administrators:(F)' | Out-Null; " ^
  "Restart-Service sshd -Force; " ^
  "Write-Host 'SUCCESS: Alienware administrators_authorized_keys updated from fleet bundle!' -ForegroundColor Green; " ^
  "Get-Content $adminKeyFile; " ^
  "Start-Sleep -Seconds 4"

@echo off
title Fix Alienware SSH for T5500 and Sabretooth (Admin Auto-Elevate)
echo ======================================================================
echo  ALIENWARE (.40) SSH AUTHORIZED KEYS FIX FOR T5500 (.15) & SABRETOOTH (.8)
echo ======================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); " ^
  "if (-not $isAdmin) { Start-Process -FilePath '%~f0' -Verb RunAs; exit }; " ^
  "$keys = @(" ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAA0qiTYQ/l+LXub9RviriX00NwQGVsqO4HV42FSo1UB KRAKKEN@T5500'," ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGnKrQKfMfqvayXuQkiBtozg/QfJ+0YlKOdPC1WXDB72 joshl@sabretooth-8'," ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB+W/AZGMLIBmQt88/OxnwptrWkUWGE3bof7j+2VfMTE fable-sabretooth-to-alienware-2026-09-18'" ^
  "); " ^
  "$userKeyFile = 'C:\Users\joshl\.ssh\authorized_keys'; " ^
  "if (Test-Path $userKeyFile) { Get-Content $userKeyFile | ForEach-Object { if ($_.Trim() -ne '' -and $keys -notcontains $_.Trim()) { $keys += $_.Trim() } } }; " ^
  "$adminKeyFile = 'C:\ProgramData\ssh\administrators_authorized_keys'; " ^
  "if (Test-Path $adminKeyFile) { Get-Content $adminKeyFile | ForEach-Object { if ($_.Trim() -ne '' -and $keys -notcontains $_.Trim()) { $keys += $_.Trim() } } }; " ^
  "$keys | Set-Content -Path $adminKeyFile -Encoding UTF8; " ^
  "$keys | Set-Content -Path $userKeyFile -Encoding UTF8; " ^
  "icacls $adminKeyFile /inheritance:r | Out-Null; " ^
  "icacls $adminKeyFile /grant 'SYSTEM:(F)' | Out-Null; " ^
  "icacls $adminKeyFile /grant 'Administrators:(F)' | Out-Null; " ^
  "Restart-Service sshd -Force; " ^
  "Write-Host 'SUCCESS: Alienware administrators_authorized_keys updated for T5500 (.15) and Sabretooth (.8)!' -ForegroundColor Green; " ^
  "Get-Content $adminKeyFile; " ^
  "Start-Sleep -Seconds 4"

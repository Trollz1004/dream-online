@echo off
title Mount Claude Cowork Org Plugins & Fix SSH Keys (Admin Auto-Elevate)
echo ======================================================================
echo  MOUNTING 14 CLAUDE COWORK ORG-PLUGINS TO C:\Program Files\Claude\org-plugins
echo  AND UPDATING ALIENWARE (.40) SSH KEYS FOR T5500 (.15) & SABRETOOTH (.8)
echo ======================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); " ^
  "if (-not $isAdmin) { Start-Process -FilePath '%~f0' -Verb RunAs; exit }; " ^
  "$orgDir = 'C:\Program Files\Claude\org-plugins'; " ^
  "New-Item -ItemType Directory -Force -Path $orgDir | Out-Null; " ^
  "Copy-Item -Path 'C:\DREAM\org-plugins-staging\*' -Destination $orgDir -Recurse -Force; " ^
  "Write-Host 'SUCCESS: 14 Organization Plugins mounted in C:\Program Files\Claude\org-plugins!' -ForegroundColor Green; " ^
  "Get-ChildItem $orgDir | Select-Object Name; " ^
  "$keys = @(" ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAA0qiTYQ/l+LXub9RviriX00NwQGVsqO4HV42FSo1UB KRAKKEN@T5500'," ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGnKrQKfMfqvayXuQkiBtozg/QfJ+0YlKOdPC1WXDB72 joshl@sabretooth-8'," ^
  "  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB+W/AZGMLIBmQt88/OxnwptrWkUWGE3bof7j+2VfMTE fable-sabretooth-to-alienware-2026-09-18'" ^
  "); " ^
  "$adminKeyFile = 'C:\ProgramData\ssh\administrators_authorized_keys'; " ^
  "if (Test-Path $adminKeyFile) { Get-Content $adminKeyFile | ForEach-Object { if ($_.Trim() -ne '' -and $keys -notcontains $_.Trim()) { $keys += $_.Trim() } } }; " ^
  "$keys | Set-Content -Path $adminKeyFile -Encoding UTF8; " ^
  "icacls $adminKeyFile /inheritance:r | Out-Null; " ^
  "icacls $adminKeyFile /grant 'SYSTEM:(F)' | Out-Null; " ^
  "icacls $adminKeyFile /grant 'Administrators:(F)' | Out-Null; " ^
  "Restart-Service sshd -Force; " ^
  "Write-Host 'SUCCESS: Alienware SSH administrators_authorized_keys updated!' -ForegroundColor Cyan; " ^
  "Start-Sleep -Seconds 4"

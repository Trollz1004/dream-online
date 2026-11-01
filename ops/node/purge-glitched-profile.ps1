# purge-glitched-profile.ps1
# Removes the orphaned C:\Users\NSFW_BOTS profile (SID S-1-5-21-3307730112-1160020418-884448263-1001)
# Requires Elevated (Run as Administrator) privileges.

$ErrorActionPreference = 'Continue'
$targetPath = 'C:\Users\NSFW_BOTS'

Write-Host "[1/4] Checking Win32_UserProfile for $targetPath..." -ForegroundColor Cyan
$prof = Get-CimInstance Win32_UserProfile -ErrorAction SilentlyContinue | Where-Object { $_.LocalPath -eq $targetPath }
if ($prof) {
  Write-Host "      Removing WMI/Registry UserProfile ($($prof.SID), Loaded=$($prof.Loaded))..." -ForegroundColor Yellow
  try {
    Remove-CimInstance -InputObject $prof -ErrorAction Stop
    Write-Host "      Win32_UserProfile removed." -ForegroundColor Green
  } catch {
    Write-Host "      Win32_UserProfile removal warning: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

if (Test-Path $targetPath) {
  Write-Host "[2/4] Taking NTFS ownership of $targetPath from orphaned SID..." -ForegroundColor Cyan
  & takeown.exe /F "$targetPath" /A /R /D Y | Out-Null

  Write-Host "[3/4] Granting Administrators full control over $targetPath..." -ForegroundColor Cyan
  & icacls.exe "$targetPath" /grant "Administrators:(OI)(CI)F" /T /C /Q | Out-Null
  & attrib.exe -r -s -h "$targetPath\*" /S /D 2>$null

  Write-Host "[4/4] Removing directory $targetPath via cmd rd /s /q..." -ForegroundColor Cyan
  & cmd.exe /c "rd /s /q `"$targetPath`"" 2>$null
}

$stillExists = Test-Path $targetPath
if (-not $stillExists) {
  Write-Host "[DONE] $targetPath has been 100% removed!" -ForegroundColor Green
} else {
  Write-Host "[WARN] $targetPath still has locked files." -ForegroundColor Red
}

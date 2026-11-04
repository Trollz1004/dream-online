# purge-glitched-profile.ps1
# Removes one orphaned Windows user profile folder under the system drive's Users folder.
# The profile folder name is passed as -ProfileName; no user name or SID is stored in this repository.
# Requires Elevated (Run as Administrator) privileges.
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^(?!\.+$)[^\\/:*?"<>|]+$')]
  [string]$ProfileName
)

$ErrorActionPreference = 'Continue'
$usersRoot = Join-Path $env:SystemDrive 'Users'
$targetPath = Join-Path $usersRoot $ProfileName

# Refuse anything that is not a direct child of the Users folder, the running user's own profile,
# or a built-in profile. This script deletes recursively, so the target is checked before any step runs.
$fullTarget = [System.IO.Path]::GetFullPath($targetPath)
$builtIn = @('Public', 'Default', 'Default User', 'All Users')
if (([System.IO.Path]::GetDirectoryName($fullTarget) -ne $usersRoot) -or
    ($fullTarget -ieq $env:USERPROFILE) -or
    ($builtIn -contains $ProfileName)) {
  Write-Host "[REFUSED] $targetPath is not an orphaned profile folder this script may remove." -ForegroundColor Red
  exit 1
}
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

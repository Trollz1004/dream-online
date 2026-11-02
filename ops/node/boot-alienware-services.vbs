' Headless Zero-Focus-Steal Launcher for Alienware Services (Node 1: .40)
' Uses WScript.Shell.Run with WindowStyle 0 (SW_HIDE) so Windows never allocates a console window or steals keyboard focus.
Option Explicit
Dim sh, repoRoot, psCmd
Set sh = CreateObject("WScript.Shell")
repoRoot = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\antigravity\DREAM-Engine"
psCmd = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & repoRoot & "\ops\node\boot-alienware-services.ps1"""
sh.Run psCmd, 0, False

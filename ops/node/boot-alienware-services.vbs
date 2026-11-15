' Headless Zero-Focus-Steal Launcher for Alienware Services (Node 1)
' Uses WScript.Shell.Run with WindowStyle 0 (SW_HIDE) so Windows never allocates a console window or steals keyboard focus.
' Runs boot-alienware-services.ps1 from the same folder as this file, so the task decides which clone runs
' (register-boot-task.ps1 points it at the DREAM-Engine-runner clone, which stays on main).
' Waits for the script and returns its exit code, so the scheduled task can restart on failure.
Option Explicit
Dim sh, fso, scriptDir, psCmd, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psCmd = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & scriptDir & "\boot-alienware-services.ps1"""
rc = sh.Run(psCmd, 0, True)
WScript.Quit rc

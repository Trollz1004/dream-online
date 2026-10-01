#requires -Version 5.1
<#
.SYNOPSIS
    Registers (or removes) the scheduled task that runs t5500-health.ps1
    every 30 minutes.

.PARAMETER ScriptPath
    The health script to run. Defaults to t5500-health.ps1 next to this
    file; Bootstrap-T5500.ps1 passes the copy it placed under
    C:\DREAM\ops-state\t5500 so the task keeps working even if the repo
    checkout moves.

.PARAMETER Uninstall
    Remove the scheduled task instead of creating it.
#>
param(
    [string]$ScriptPath = (Join-Path $PSScriptRoot 't5500-health.ps1'),
    [switch]$Uninstall
)

$script:TaskName = 'DREAM-T5500-Health'

if ($Uninstall) {
    if (Get-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $script:TaskName -Confirm:$false
        Write-Host "Removed scheduled task '$script:TaskName'."
    } else {
        Write-Host "Scheduled task '$script:TaskName' was not present."
    }
    return
}

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Cannot register the health task: '$ScriptPath' does not exist."
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 30) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $script:TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Registered scheduled task '$script:TaskName' to run every 30 minutes, calling:"
Write-Host "  $ScriptPath"

# New-DreamTestZone.ps1
#
# Rebuilds the Blueprint-only DreamOnline test-zone Unreal project from the
# engine's locally installed Third Person Blueprint template plus its Combat
# variant shared content pack. Epic's Unreal Engine EULA forbids
# redistributing engine template content, and this repository is public, so
# none of the generated Content is committed to git: this script is what the
# repo ships instead, and it recreates the project from the installed engine
# every time it is run.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File New-DreamTestZone.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File New-DreamTestZone.ps1 -Force

[CmdletBinding()]
param(
    [string]$EngineRoot = 'C:\DREAM\UE_5.8',
    [string]$ProjectRoot = 'C:\DREAM\dream-online\game\unreal\DreamOnline',
    [string]$Variant = 'Combat',
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Variant -ne 'Combat') {
    throw "Unsupported -Variant '$Variant'. Only 'Combat' is supported."
}

$templateRoot = Join-Path $EngineRoot 'Templates\TP_ThirdPersonBP'
$resourcesRoot = Join-Path $EngineRoot 'Templates\TemplateResources'
$templateConfig = Join-Path $templateRoot 'Config'
$templateContent = Join-Path $templateRoot 'Content'

if (-not (Test-Path -LiteralPath $EngineRoot)) {
    throw "Engine root not found: $EngineRoot"
}
if (-not (Test-Path -LiteralPath $templateRoot)) {
    throw "Third Person Blueprint template not found under engine root: $templateRoot"
}
if (-not (Test-Path -LiteralPath $resourcesRoot)) {
    throw "TemplateResources not found under engine root: $resourcesRoot"
}

# If the project already exists, refuse to touch it unless -Force is given.
# This check runs before any write happens, so a plain re-run is a no-op
# that changes nothing on disk.
if (Test-Path -LiteralPath $ProjectRoot) {
    if (-not $Force) {
        throw "Project already exists at $ProjectRoot. Re-run with -Force to rebuild it (the old folder is renamed, never deleted)."
    }
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $projectLeaf = Split-Path -Path $ProjectRoot -Leaf
    $backupLeaf = "$projectLeaf.backup-$timestamp"
    Rename-Item -LiteralPath $ProjectRoot -NewName $backupLeaf
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Names the engine wizard's TemplateDefs.ini excludes from a fresh project.
$ignoreFolderNames = @('Binaries', 'Build', 'Intermediate', 'Saved', 'Media')
$ignoreFileNames = @('TP_ThirdPersonBP.uproject', 'TP_ThirdPersonBP.png', 'TemplateDefs.ini', 'config.ini', 'Manifest.json', 'contents.txt')

function Copy-TemplateTree {
    # Recursive copy that mirrors the engine wizard's ignore rules: skips
    # folders/files by name at any depth under the source tree.
    param(
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        return
    }

    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        if ($_.PSIsContainer) {
            if ($ignoreFolderNames -contains $_.Name) {
                return
            }
            $destDir = Join-Path $Destination $_.Name
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            Copy-TemplateTree -Source $_.FullName -Destination $destDir
        }
        else {
            if ($ignoreFileNames -contains $_.Name) {
                return
            }
            if (-not (Test-Path -LiteralPath $Destination)) {
                New-Item -ItemType Directory -Path $Destination -Force | Out-Null
            }
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Force
        }
    }
}

function Copy-PlainTree {
    # Unconditional recursive copy, used for shared content packs where the
    # caller already picked the exact subfolder to copy (Content, or one of
    # the External folders) and no further filtering is needed.
    param(
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        return
    }

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $sourceFull = (Resolve-Path -LiteralPath $Source).ProviderPath.TrimEnd('\')

    Get-ChildItem -LiteralPath $Source -Force -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($sourceFull.Length).TrimStart('\')
        $destPath = Join-Path $Destination $relative
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        }
        else {
            $destParent = Split-Path -Path $destPath -Parent
            if (-not (Test-Path -LiteralPath $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            Copy-Item -LiteralPath $_.FullName -Destination $destPath -Force
        }
    }
}

New-Item -ItemType Directory -Path $ProjectRoot -Force | Out-Null

# 1. Config + Content from the template, minus the wizard's ignore list.
Copy-TemplateTree -Source $templateConfig -Destination (Join-Path $ProjectRoot 'Config')
Copy-TemplateTree -Source $templateContent -Destination (Join-Path $ProjectRoot 'Content')

# 2. Shared content packs (Content only) mounted under Content\<MountName>.
#    LevelPrototyping/Characters/Input are the always-on High-detail packs;
#    Variant_Combat is the Combat variant's Standard-detail pack.
$packs = @(
    @{ Level = 'High'; MountName = 'LevelPrototyping' },
    @{ Level = 'High'; MountName = 'Characters' },
    @{ Level = 'High'; MountName = 'Input' },
    @{ Level = 'Standard'; MountName = 'Variant_Combat' }
)

foreach ($pack in $packs) {
    $packRoot = Join-Path $resourcesRoot (Join-Path $pack.Level $pack.MountName)
    $packContent = Join-Path $packRoot 'Content'
    Copy-PlainTree -Source $packContent -Destination (Join-Path $ProjectRoot (Join-Path 'Content' $pack.MountName))

    # A pack's __ExternalActors__/__ExternalObjects__ (one-file-per-actor
    # data) sit beside its Content folder, not inside it. Verified against
    # Variant_Combat's FeaturePack\manifest.json: AdditionalFilesList copies
    # Content/*.*, __ExternalActors__/*.* and __ExternalObjects__/*.* with
    # DestinationFilesFolder="Variant_Combat" for all three, and the source
    # __ExternalActors__ folder is already keyed by map name (Lvl_Combat)
    # with no MountName prefix of its own. So the MountName has to be
    # inserted under Content\__ExternalActors__\ instead, giving
    # Content\__ExternalActors__\Variant_Combat\Lvl_Combat\... - the path
    # Unreal's one-file-per-actor loader expects for map
    # /Game/Variant_Combat/Lvl_Combat. LevelPrototyping/Characters/Input do
    # not carry either folder, so this loop is a no-op for them.
    foreach ($externalFolder in @('__ExternalActors__', '__ExternalObjects__')) {
        $packExternal = Join-Path $packRoot $externalFolder
        if (Test-Path -LiteralPath $packExternal) {
            Copy-PlainTree -Source $packExternal -Destination (Join-Path $ProjectRoot (Join-Path 'Content' (Join-Path $externalFolder $pack.MountName)))
        }
    }
}

# 3. Write DreamOnline.uproject (UTF-8, no BOM). Same plugin set as the
#    template; there is no C++ compiler on this box, so no Source folder and
#    no Modules entry.
$uprojectObject = [ordered]@{
    FileVersion       = 3
    EngineAssociation = '5.8'
    Category          = ''
    Description       = 'DREAM ONLINE test zone'
    Plugins           = @(
        [ordered]@{ Name = 'ModelingToolsEditorMode'; Enabled = $true; TargetAllowList = @('Editor') },
        [ordered]@{ Name = 'GameplayStateTree'; Enabled = $true }
    )
}
$uprojectJson = $uprojectObject | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText((Join-Path $ProjectRoot 'DreamOnline.uproject'), $uprojectJson, $utf8NoBom)

# 4. Rename TP_ThirdPersonBP -> DreamOnline inside every copied .ini.
#    Order matters: the two case-sensitive passes run first so the later
#    case-insensitive pass cannot re-touch what they already fixed.
$configDir = Join-Path $ProjectRoot 'Config'
if (Test-Path -LiteralPath $configDir) {
    Get-ChildItem -LiteralPath $configDir -Filter '*.ini' -Recurse -File | ForEach-Object {
        $text = [System.IO.File]::ReadAllText($_.FullName)
        $text = $text.Replace('TP_THIRDPERSONBP', 'DREAMONLINE')
        $text = $text.Replace('tp_thirdpersonbp', 'dreamonline')
        $text = [regex]::Replace($text, 'TP_ThirdPersonBP', 'DreamOnline', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
    }
}

# 5. Point the project at the Combat variant's map and game mode.
$defaultEnginePath = Join-Path $configDir 'DefaultEngine.ini'
if (Test-Path -LiteralPath $defaultEnginePath) {
    $lines = [System.IO.File]::ReadAllText($defaultEnginePath) -split "`r`n|`n"
    $inGameMaps = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s*\[') {
            $inGameMaps = ($line.Trim() -eq '[/Script/EngineSettings.GameMapsSettings]')
            continue
        }
        if ($inGameMaps) {
            if ($line -match '^\s*EditorStartupMap\s*=') {
                $lines[$i] = 'EditorStartupMap=/Game/Variant_Combat/Lvl_Combat.Lvl_Combat'
            }
            elseif ($line -match '^\s*GameDefaultMap\s*=') {
                $lines[$i] = 'GameDefaultMap=/Game/Variant_Combat/Lvl_Combat.Lvl_Combat'
            }
            elseif ($line -match '^\s*GlobalDefaultGameMode\s*=') {
                $lines[$i] = 'GlobalDefaultGameMode=/Game/Variant_Combat/Blueprints/BP_CombatGameMode.BP_CombatGameMode_C'
            }
        }
    }
    $newText = ($lines -join "`r`n")
    [System.IO.File]::WriteAllText($defaultEnginePath, $newText, $utf8NoBom)
}

Write-Output "DreamOnline test zone rebuilt at $ProjectRoot"

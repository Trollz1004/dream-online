# New-DreamTestZone.Tests.ps1
#
# Pester 3.4 tests for New-DreamTestZone.ps1. Builds a tiny fake engine root
# under $TestDrive that mimics the real C:\DREAM\UE_5.8 layout (fake
# TP_ThirdPersonBP template plus fake TemplateResources packs), then runs the
# script against that fake root instead of the real engine.
#
# All five scenarios (first run, second run without -Force, -Force rebuild,
# missing engine root, unsupported variant) run once, in order, inside the
# single Describe-level BeforeAll below, and every Context/It below only
# reads back the results. This is deliberate: Pester 3.4 rolls back anything
# written to $TestDrive inside a nested Context's own BeforeAll once that
# Context finishes, so state a later Context depends on (like "the project
# already exists") does not reliably survive if it is created inside a
# sibling Context instead of the shared Describe-level BeforeAll.

$scriptPath = Join-Path $PSScriptRoot 'New-DreamTestZone.ps1'

function New-Utf8NoBomFile {
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [string]$Content
    )
    $parent = Split-Path -Path $Path -Parent
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

Describe 'New-DreamTestZone' {

    BeforeAll {
        $script:engineRoot = Join-Path $TestDrive 'FakeEngine'
        $script:templateRoot = Join-Path $script:engineRoot 'Templates\TP_ThirdPersonBP'
        $script:resourcesRoot = Join-Path $script:engineRoot 'Templates\TemplateResources'
        $script:projectParent = Join-Path $TestDrive 'game\unreal'
        $script:projectRoot = Join-Path $script:projectParent 'DreamOnline'

        # --- Fake TP_ThirdPersonBP template ---

        # Config: the five real ini files, plus the two wizard-ignored ones.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\DefaultEditor.ini') -Content "[UnrealEd.SimpleMap]`r`nSimpleMapName=/Game/TP_ThirdPerson/Maps/ThirdPersonExampleMap`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\DefaultEditorPerProjectUserSettings.ini') -Content "[ContentBrowser]`r`nContentBrowserTab1.SelectedPaths=/Game/ThirdPersonBP`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\DefaultGame.ini') -Content "[/Script/EngineSettings.GeneralProjectSettings]`r`nProjectName=Third Person BP Game Template`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\DefaultInput.ini') -Content "[/Script/Engine.InputSettings]`r`n+ActionMappings=(ActionName=`"Jump`")`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\DefaultEngine.ini') -Content @"
[URL]
GameName=TP_ThirdPersonBP

[/Script/EngineSettings.GameMapsSettings]
EditorStartupMap=/Game/ThirdPerson/Lvl_ThirdPerson.Lvl_ThirdPerson
GameDefaultMap=/Game/ThirdPerson/Lvl_ThirdPerson.Lvl_ThirdPerson
TransitionMap=
GlobalDefaultGameMode=/Game/ThirdPerson/Blueprints/BP_ThirdPersonGameMode.BP_ThirdPersonGameMode_C

[TestMarkers]
UpperCaseMarker=TP_THIRDPERSONBP
LowerCaseMarker=tp_thirdpersonbp
MixedCaseMarker=TP_ThirdPersonBP
"@
        # Wizard-ignored config files - must never survive into the project.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\TemplateDefs.ini') -Content "; wizard-only file, never copied`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\config.ini') -Content "GameName=TP_ThirdPersonBP`r`n"
        # Nested ignored folder inside Config, to prove recursive skip.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Config\Saved\leftover.ini') -Content "leftover`r`n"

        # Content: the template's own content, kept at its own paths.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\ThirdPerson\SomeAsset.txt') -Content "third person content`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\__ExternalActors__\ThirdPerson\Lvl_ThirdPerson\dummy1.uasset') -Content "external actor 1`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\__ExternalObjects__\ThirdPerson\Lvl_ThirdPerson\dummy2.uasset') -Content "external object 1`r`n"
        # Ignored files/folders nested inside Content, to prove filter-by-name works everywhere, not just at template root.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\Manifest.json') -Content "{}`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\contents.txt') -Content "listing`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Content\Intermediate\stray.txt') -Content "stray`r`n"

        # Template-root ignored folders/files (siblings of Config/Content), matching the real layout.
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Media\screenshot.png.txt') -Content "media`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Binaries\stray.txt') -Content "stray`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Build\stray.txt') -Content "stray`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'Saved\stray.txt') -Content "stray`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'TP_ThirdPersonBP.uproject') -Content "{}`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:templateRoot 'TP_ThirdPersonBP.png.txt') -Content "icon`r`n"

        # --- Fake TemplateResources packs ---
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\LevelPrototyping\Content\Meshes\Prototype.txt') -Content "prototyping content`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\LevelPrototyping\FeaturePack\manifest.json') -Content "{}`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\LevelPrototyping\Media\thumb.png.txt') -Content "thumb`r`n"

        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\Characters\Content\Character.txt') -Content "characters content`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\Characters\FeaturePack\manifest.json') -Content "{}`r`n"

        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\Input\Content\Actions\IA_Move.txt') -Content "input content`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'High\Input\FeaturePack\manifest.json') -Content "{}`r`n"

        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'Standard\Variant_Combat\Content\Blueprints\BP_CombatGameMode.txt') -Content "combat content`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'Standard\Variant_Combat\FeaturePack\manifest.json') -Content "{}`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'Standard\Variant_Combat\Media\thumb.png.txt') -Content "thumb`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'Standard\Variant_Combat\__ExternalActors__\Lvl_Combat\dummy3.uasset') -Content "external actor 2`r`n"
        New-Utf8NoBomFile -Path (Join-Path $script:resourcesRoot 'Standard\Variant_Combat\__ExternalObjects__\Lvl_Combat\dummy4.uasset') -Content "external object 2`r`n"

        # --- Scenario 1: first run against a clean project root ---
        & $scriptPath -EngineRoot $script:engineRoot -ProjectRoot $script:projectRoot
        $script:firstRunUprojectContent = Get-Content -LiteralPath (Join-Path $script:projectRoot 'DreamOnline.uproject') -Raw
        $script:firstRunFileCount = (Get-ChildItem -Path $script:projectRoot -Recurse -File).Count

        # --- Scenario 2: second run without -Force must throw and change nothing ---
        $script:secondRunThrew = $false
        try {
            & $scriptPath -EngineRoot $script:engineRoot -ProjectRoot $script:projectRoot
        }
        catch {
            $script:secondRunThrew = $true
        }
        $script:afterSecondRunUprojectContent = Get-Content -LiteralPath (Join-Path $script:projectRoot 'DreamOnline.uproject') -Raw
        $script:afterSecondRunFileCount = (Get-ChildItem -Path $script:projectRoot -Recurse -File).Count
        $script:backupsAfterSecondRun = @(Get-ChildItem -Path $script:projectParent -Directory | Where-Object { $_.Name -like 'DreamOnline.backup-*' })

        # --- Scenario 3: -Force renames the old project aside and rebuilds fresh ---
        $script:canaryPath = Join-Path $script:projectRoot 'CANARY-old-project.txt'
        New-Utf8NoBomFile -Path $script:canaryPath -Content "this is the old project`r`n"
        & $scriptPath -EngineRoot $script:engineRoot -ProjectRoot $script:projectRoot -Force
        $script:backupsAfterForce = @(Get-ChildItem -Path $script:projectParent -Directory | Where-Object { $_.Name -like 'DreamOnline.backup-*' })

        # --- Scenario 4: a missing engine root throws ---
        $script:missingEngineRootThrew = $false
        try {
            & $scriptPath -EngineRoot (Join-Path $TestDrive 'NoSuchEngine') -ProjectRoot (Join-Path $TestDrive 'game2\unreal\DreamOnline')
        }
        catch {
            $script:missingEngineRootThrew = $true
        }

        # --- Scenario 5: an unsupported -Variant throws ---
        $script:unsupportedVariantThrew = $false
        try {
            & $scriptPath -EngineRoot $script:engineRoot -ProjectRoot (Join-Path $TestDrive 'game3\unreal\DreamOnline') -Variant 'Horror'
        }
        catch {
            $script:unsupportedVariantThrew = $true
        }
    }

    Context 'the rebuilt project (checked on the live project folder after every scenario above has run)' {

        It 'copies the template own content at its own path' {
            (Join-Path $script:projectRoot 'Content\ThirdPerson\SomeAsset.txt') | Should Exist
        }

        It 'keeps the template own __ExternalActors__ at their own path' {
            (Join-Path $script:projectRoot 'Content\__ExternalActors__\ThirdPerson\Lvl_ThirdPerson\dummy1.uasset') | Should Exist
        }

        It 'keeps the template own __ExternalObjects__ at their own path' {
            (Join-Path $script:projectRoot 'Content\__ExternalObjects__\ThirdPerson\Lvl_ThirdPerson\dummy2.uasset') | Should Exist
        }

        It 'contains none of the ignored folder names anywhere under the project' {
            $ignoredFolderNames = @('Binaries', 'Build', 'Intermediate', 'Saved', 'Media')
            $found = Get-ChildItem -Path $script:projectRoot -Recurse -Directory | Where-Object { $ignoredFolderNames -contains $_.Name }
            $found.Count | Should Be 0
        }

        It 'contains none of the ignored template files anywhere under the project' {
            $ignoredFileNames = @('TP_ThirdPersonBP.uproject', 'TP_ThirdPersonBP.png', 'TemplateDefs.ini', 'config.ini', 'Manifest.json', 'contents.txt')
            $found = Get-ChildItem -Path $script:projectRoot -Recurse -File | Where-Object { $ignoredFileNames -contains $_.Name }
            $found.Count | Should Be 0
        }

        It 'landed the LevelPrototyping pack under Content\LevelPrototyping' {
            (Join-Path $script:projectRoot 'Content\LevelPrototyping\Meshes\Prototype.txt') | Should Exist
        }

        It 'landed the Characters pack under Content\Characters' {
            (Join-Path $script:projectRoot 'Content\Characters\Character.txt') | Should Exist
        }

        It 'landed the Input pack under Content\Input' {
            (Join-Path $script:projectRoot 'Content\Input\Actions\IA_Move.txt') | Should Exist
        }

        It 'landed the Variant_Combat pack under Content\Variant_Combat' {
            (Join-Path $script:projectRoot 'Content\Variant_Combat\Blueprints\BP_CombatGameMode.txt') | Should Exist
        }

        It 'did not copy the Variant_Combat pack FeaturePack folder' {
            (Join-Path $script:projectRoot 'Content\Variant_Combat\FeaturePack') | Should Not Exist
        }

        It 'did not copy the Variant_Combat pack Media folder' {
            (Join-Path $script:projectRoot 'Content\Variant_Combat\Media') | Should Not Exist
        }

        It 'places the Variant_Combat pack external actors under Content\__ExternalActors__\Variant_Combat' {
            (Join-Path $script:projectRoot 'Content\__ExternalActors__\Variant_Combat\Lvl_Combat\dummy3.uasset') | Should Exist
        }

        It 'places the Variant_Combat pack external objects under Content\__ExternalObjects__\Variant_Combat' {
            (Join-Path $script:projectRoot 'Content\__ExternalObjects__\Variant_Combat\Lvl_Combat\dummy4.uasset') | Should Exist
        }

        It 'writes a DreamOnline.uproject that parses as JSON' {
            $jsonPath = Join-Path $script:projectRoot 'DreamOnline.uproject'
            $jsonPath | Should Exist
            { Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json } | Should Not Throw
        }

        It 'sets EngineAssociation to 5.8 in the uproject' {
            $project = Get-Content -LiteralPath (Join-Path $script:projectRoot 'DreamOnline.uproject') -Raw | ConvertFrom-Json
            $project.EngineAssociation | Should Be '5.8'
        }

        It 'carries both plugins in the uproject' {
            $project = Get-Content -LiteralPath (Join-Path $script:projectRoot 'DreamOnline.uproject') -Raw | ConvertFrom-Json
            $project.Plugins.Count | Should Be 2
            ($project.Plugins | Where-Object { $_.Name -eq 'ModelingToolsEditorMode' }).Enabled | Should Be $true
            ($project.Plugins | Where-Object { $_.Name -eq 'GameplayStateTree' }).Enabled | Should Be $true
        }

        It 'has no Modules property in the uproject' {
            $project = Get-Content -LiteralPath (Join-Path $script:projectRoot 'DreamOnline.uproject') -Raw | ConvertFrom-Json
            ($project.PSObject.Properties.Name -contains 'Modules') | Should Be $false
        }

        It 'wrote the uproject file as UTF-8 without a BOM' {
            $bytes = [System.IO.File]::ReadAllBytes((Join-Path $script:projectRoot 'DreamOnline.uproject'))
            $hasBom = ($bytes.Length -ge 3) -and ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)
            $hasBom | Should Be $false
        }

        It 'replaced the upper-case marker with DREAMONLINE' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match 'UpperCaseMarker=DREAMONLINE'
        }

        It 'replaced the lower-case marker with dreamonline' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match 'LowerCaseMarker=dreamonline'
        }

        It 'replaced the mixed-case marker with DreamOnline' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match 'MixedCaseMarker=DreamOnline'
        }

        It 'left no residual TP_ThirdPersonBP spelling in DefaultEngine.ini' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Not Match 'TP_THIRDPERSONBP'
            $content | Should Not Match 'tp_thirdpersonbp'
            $content | Should Not Match 'TP_ThirdPersonBP'
        }

        It 'wrote DefaultEngine.ini as UTF-8 without a BOM' {
            $bytes = [System.IO.File]::ReadAllBytes((Join-Path $script:projectRoot 'Config\DefaultEngine.ini'))
            $hasBom = ($bytes.Length -ge 3) -and ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)
            $hasBom | Should Be $false
        }

        It 'set EditorStartupMap to the Combat map' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match ([regex]::Escape('EditorStartupMap=/Game/Variant_Combat/Lvl_Combat.Lvl_Combat'))
        }

        It 'set GameDefaultMap to the Combat map' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match ([regex]::Escape('GameDefaultMap=/Game/Variant_Combat/Lvl_Combat.Lvl_Combat'))
        }

        It 'set GlobalDefaultGameMode to the Combat game mode' {
            $content = Get-Content -LiteralPath (Join-Path $script:projectRoot 'Config\DefaultEngine.ini') -Raw
            $content | Should Match ([regex]::Escape('GlobalDefaultGameMode=/Game/Variant_Combat/Blueprints/BP_CombatGameMode.BP_CombatGameMode_C'))
        }
    }

    Context 'second run without -Force (idempotency)' {

        It 'throws because the project already exists' {
            $script:secondRunThrew | Should Be $true
        }

        It 'left the existing uproject file unchanged' {
            $script:afterSecondRunUprojectContent | Should Be $script:firstRunUprojectContent
        }

        It 'did not add or remove files in the existing project' {
            $script:afterSecondRunFileCount | Should Be $script:firstRunFileCount
        }

        It 'did not create a backup folder' {
            $script:backupsAfterSecondRun.Count | Should Be 0
        }
    }

    Context 'rebuild with -Force' {

        It 'creates exactly one backup folder beside the project' {
            $script:backupsAfterForce.Count | Should Be 1
        }

        It 'never deletes the old project - the canary survives in the backup' {
            (Join-Path $script:backupsAfterForce[0].FullName 'CANARY-old-project.txt') | Should Exist
        }

        It 'writes a fresh project that does not carry the old canary' {
            (Join-Path $script:projectRoot 'CANARY-old-project.txt') | Should Not Exist
        }

        It 'the fresh project has a valid uproject file again' {
            (Join-Path $script:projectRoot 'DreamOnline.uproject') | Should Exist
        }
    }

    Context 'a missing engine root' {

        It 'throws' {
            $script:missingEngineRootThrew | Should Be $true
        }
    }

    Context 'an unsupported variant' {

        It 'throws' {
            $script:unsupportedVariantThrew | Should Be $true
        }
    }
}

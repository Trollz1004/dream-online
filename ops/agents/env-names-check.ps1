<#
.SYNOPSIS
  Discovers env.required.json manifests and verifies required setting NAMES only.
  With -ListTargetsOnly, never touches or opens any .env file on disk.
  Windows PowerShell 5.1 compatible.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = '',

  [string]$EnvRoot = '',

  [ValidateSet('all', 'alienware', 't5500')]
  [string]$Node = 'all',

  [switch]$ListTargetsOnly,

  [switch]$Json,

  [switch]$SoftExit,

  [switch]$NoRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:EnvCheckNoRun = [bool]$NoRun
$script:EnvCheckRepoRoot = if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
} else {
  (Resolve-Path -LiteralPath $RepoRoot).Path
}
$script:EnvCheckEnvRoot = $EnvRoot
$script:EnvCheckNode = $Node
$script:EnvCheckListTargetsOnly = [bool]$ListTargetsOnly
$script:EnvCheckJson = [bool]$Json
$script:EnvCheckSoftExit = [bool]$SoftExit
$script:LastEnvReport = $null

$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:IgnoredDirNames = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($d in @('node_modules', '.git', 'dist', 'archive', '.venv')) {
  [void]$script:IgnoredDirNames.Add($d)
}

function Get-RelativeUnixPath {
  param(
    [string]$BaseDir,
    [string]$TargetPath
  )
  $baseNorm = $BaseDir.TrimEnd('\', '/')
  $targetFull = $TargetPath
  if ($targetFull.StartsWith($baseNorm, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $targetFull.Substring($baseNorm.Length).TrimStart('\', '/')
    if ([string]::IsNullOrEmpty($rel)) { return '.' }
    return ($rel -replace '\\', '/')
  }
  return ($targetFull -replace '\\', '/')
}

function Find-EnvRequiredManifestPaths {
  param([string]$RootDir)
  if (-not (Test-Path -LiteralPath $RootDir)) {
    throw "RepoRoot not found: $RootDir"
  }
  $results = New-Object System.Collections.Generic.List[string]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push($RootDir)

  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    $manifest = Join-Path $current 'env.required.json'
    if (Test-Path -LiteralPath $manifest -PathType Leaf) {
      $results.Add($manifest)
    }
    $subDirs = [System.IO.Directory]::GetDirectories($current)
    foreach ($sub in $subDirs) {
      $leaf = Split-Path -Leaf $sub
      if (-not $script:IgnoredDirNames.Contains($leaf)) {
        $stack.Push($sub)
      }
    }
  }

  $sorted = @($results.ToArray() | Sort-Object { Get-RelativeUnixPath -BaseDir $RootDir -TargetPath $_ })
  return $sorted
}

function Test-ManifestMatchesNode {
  param(
    [object]$ManifestNodeValue,
    [string]$TargetNode
  )
  if ($TargetNode -eq 'all') { return $true }
  if ($null -eq $ManifestNodeValue) { return $false }

  if ($ManifestNodeValue -is [System.Collections.IEnumerable] -and -not ($ManifestNodeValue -is [string])) {
    foreach ($entry in $ManifestNodeValue) {
      $s = [string]$entry
      if ($s -ieq $TargetNode -or $s -ieq 'all') { return $true }
    }
    return $false
  }

  $nodeStr = ([string]$ManifestNodeValue).Trim()
  if ($nodeStr -ieq 'all' -or $nodeStr -ieq $TargetNode) { return $true }
  if ($nodeStr.Contains('|')) {
    foreach ($part in $nodeStr.Split('|')) {
      if ($part.Trim() -ieq $TargetNode -or $part.Trim() -ieq 'all') { return $true }
    }
  }
  return $false
}

function Get-OptionalObjectProperty {
  param(
    [object]$Obj,
    [string]$PropertyName,
    [object]$DefaultValue = $null
  )
  if ($null -eq $Obj) { return $DefaultValue }
  $prop = $Obj.PSObject.Properties[$PropertyName]
  if ($null -eq $prop) { return $DefaultValue }
  return $prop.Value
}

function Resolve-EnvTargetInfo {
  param(
    [string]$RepoDir,
    [string]$ManifestPath,
    [string]$EnvFileSpec,
    [string]$ExplicitEnvRoot
  )
  $manifestDir = Split-Path -Parent $ManifestPath
  $relManifest = Get-RelativeUnixPath -BaseDir $RepoDir -TargetPath $ManifestPath
  $relServiceDir = Get-RelativeUnixPath -BaseDir $RepoDir -TargetPath $manifestDir
  if ($relServiceDir -eq '.') { $relServiceDir = '' }

  $spec = if ([string]::IsNullOrWhiteSpace($EnvFileSpec)) { '.env' } else { $EnvFileSpec.Trim() }
  if ($spec.StartsWith('repo:', [System.StringComparison]::OrdinalIgnoreCase)) {
    $sub = $spec.Substring(5).TrimStart('\', '/')
    $resolvedPath = Join-Path $RepoDir $sub
    $displayEnvFile = (($sub -replace '\\', '/') -replace '^\./', '')
  } else {
    if (-not [string]::IsNullOrWhiteSpace($ExplicitEnvRoot)) {
      $baseDir = if ([string]::IsNullOrEmpty($relServiceDir)) {
        $ExplicitEnvRoot
      } else {
        Join-Path $ExplicitEnvRoot ($relServiceDir -replace '/', '\')
      }
    } else {
      $baseDir = $manifestDir
    }
    $resolvedPath = Join-Path $baseDir $spec
    $relDisplay = if ([string]::IsNullOrEmpty($relServiceDir)) { $spec } else { "$relServiceDir/$spec" }
    $displayEnvFile = (($relDisplay -replace '\\', '/') -replace '^\./', '')
  }

  return [PSCustomObject]@{
    RelManifest = $relManifest
    DisplayEnvFile = $displayEnvFile
    ResolvedEnvPath = $resolvedPath
  }
}

function Get-PresentEnvKeyNames {
  param([string]$EnvFilePath)
  $present = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
  $reader = New-Object System.IO.StreamReader($EnvFilePath, $script:Utf8NoBom)
  try {
    $line = $null
    while ($null -ne ($line = $reader.ReadLine())) {
      if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $keyName = $matches[1]
        $rhs = $matches[2].Trim()
        $matches.Clear()

        $inner = ''
        if ($rhs.StartsWith('"')) {
          if ($rhs -match '^"((?:[^"\\]|\\.)*)"(?:\s*#.*)?$') {
            $inner = $matches[1].Trim()
            $matches.Clear()
          } else {
            $inner = $rhs.Trim('"').Trim()
          }
        } elseif ($rhs.StartsWith("'")) {
          if ($rhs -match "^'([^']*)'(?:\s*#.*)?$") {
            $inner = $matches[1].Trim()
            $matches.Clear()
          } else {
            $inner = $rhs.Trim("'").Trim()
          }
        } else {
          $inner = ([regex]::Replace($rhs, '(?:\s+#.*$|^#.*$)', '')).Trim()
        }

        $hasValue = ($inner.Length -gt 0)
        $rhs = $null
        $inner = $null
        $line = $null

        if ($hasValue) {
          [void]$present.Add($keyName)
        }
      }
      $line = $null
    }
  } finally {
    $reader.Dispose()
  }
  return ,$present
}

function ConvertTo-JsonStringArray {
  param([string[]]$Items)
  if ($null -eq $Items -or $Items.Count -eq 0) {
    return '[]'
  }
  $quoted = New-Object System.Collections.Generic.List[string]
  foreach ($item in $Items) {
    $quoted.Add(([string]$item | ConvertTo-Json -Compress))
  }
  return '[' + ($quoted -join ', ') + ']'
}

function ConvertTo-EnvReportJson {
  param(
    [bool]$IsOk,
    [bool]$IsListTargetsOnly,
    [string]$NodeFilter,
    [int]$MissingCount,
    [object[]]$Services
  )
  $serviceBlocks = New-Object System.Collections.Generic.List[string]
  foreach ($svc in $Services) {
    $reqJson = ConvertTo-JsonStringArray -Items @($svc.required)
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('    {')
    $lines.Add(('      "service": {0},' -f ([string]$svc.service | ConvertTo-Json -Compress)))
    $lines.Add(('      "node": {0},' -f ([string]$svc.node | ConvertTo-Json -Compress)))
    $lines.Add(('      "manifest": {0},' -f ([string]$svc.manifest | ConvertTo-Json -Compress)))
    $lines.Add(('      "envFile": {0},' -f ([string]$svc.envFile | ConvertTo-Json -Compress)))

    if ($IsListTargetsOnly) {
      $altEntries = New-Object System.Collections.Generic.List[string]
      foreach ($altKey in $svc.alternatives.Keys) {
        $altVals = ConvertTo-JsonStringArray -Items @($svc.alternatives[$altKey])
        $altEntries.Add(('{0}: {1}' -f ([string]$altKey | ConvertTo-Json -Compress), $altVals))
      }
      $altJson = '{' + ($altEntries -join ', ') + '}'
      $optJson = ConvertTo-JsonStringArray -Items @($svc.optional)
      $lines.Add(('      "required": {0},' -f $reqJson))
      $lines.Add(('      "alternatives": {0},' -f $altJson))
      $lines.Add(('      "optional": {0}' -f $optJson))
    } else {
      $existsText = if ($svc.envFileExists) { 'true' } else { 'false' }
      $missJson = ConvertTo-JsonStringArray -Items @($svc.missingEnv)
      $lines.Add(('      "envFileExists": {0},' -f $existsText))
      $lines.Add(('      "status": {0},' -f ([string]$svc.status | ConvertTo-Json -Compress)))
      $lines.Add(('      "required": {0},' -f $reqJson))
      $lines.Add(('      "missingEnv": {0}' -f $missJson))
    }
    $lines.Add('    }')
    $serviceBlocks.Add(($lines -join "`n"))
  }

  $servicesArrayJson = if ($serviceBlocks.Count -eq 0) {
    '[]'
  } else {
    "[" + "`n" + ($serviceBlocks -join ",`n") + "`n  ]"
  }

  $okText = if ($IsOk) { 'true' } else { 'false' }
  $listText = if ($IsListTargetsOnly) { 'true' } else { 'false' }
  $outLines = New-Object System.Collections.Generic.List[string]
  $outLines.Add('{')
  $outLines.Add(('  "ok": {0},' -f $okText))
  $outLines.Add(('  "listTargetsOnly": {0},' -f $listText))
  $outLines.Add(('  "node": {0},' -f ($NodeFilter | ConvertTo-Json -Compress)))
  if (-not $IsListTargetsOnly) {
    $outLines.Add(('  "missingCount": {0},' -f $MissingCount))
  }
  $outLines.Add(('  "services": {0}' -f $servicesArrayJson))
  $outLines.Add('}')
  return ($outLines -join "`n")
}

function Get-EnvNamesReport {
  param(
    [string]$TargetRepoRoot = $script:EnvCheckRepoRoot,
    [string]$TargetEnvRoot = $script:EnvCheckEnvRoot,
    [string]$TargetNode = $script:EnvCheckNode,
    [bool]$OnlyTargets = $script:EnvCheckListTargetsOnly
  )

  $manifestPaths = @(Find-EnvRequiredManifestPaths -RootDir $TargetRepoRoot)
  $serviceReports = New-Object System.Collections.Generic.List[object]
  $missingServiceCount = 0

  foreach ($manifestPath in $manifestPaths) {
    $rawText = [System.IO.File]::ReadAllText($manifestPath, $script:Utf8NoBom)
    $manifest = $rawText | ConvertFrom-Json
    $nodeVal = Get-OptionalObjectProperty -Obj $manifest -PropertyName 'node' -DefaultValue 'alienware'
    if (-not (Test-ManifestMatchesNode -ManifestNodeValue $nodeVal -TargetNode $TargetNode)) {
      continue
    }

    $serviceName = [string](Get-OptionalObjectProperty -Obj $manifest -PropertyName 'service' -DefaultValue 'unknown')
    $envFileSpec = [string](Get-OptionalObjectProperty -Obj $manifest -PropertyName 'envFile' -DefaultValue '.env')
    $reqRaw = Get-OptionalObjectProperty -Obj $manifest -PropertyName 'required' -DefaultValue @()
    $requiredList = New-Object System.Collections.Generic.List[string]
    foreach ($r in @($reqRaw)) {
      $rs = ([string]$r).Trim()
      if ($rs.Length -gt 0) { $requiredList.Add($rs) }
    }

    $altMap = @{}
    $altObj = Get-OptionalObjectProperty -Obj $manifest -PropertyName 'alternatives' -DefaultValue $null
    if ($null -ne $altObj) {
      foreach ($p in $altObj.PSObject.Properties) {
        $vals = New-Object System.Collections.Generic.List[string]
        foreach ($v in @($p.Value)) {
          $vs = ([string]$v).Trim()
          if ($vs.Length -gt 0) { $vals.Add($vs) }
        }
        $altMap[$p.Name] = @($vals.ToArray())
      }
    }

    $optRaw = Get-OptionalObjectProperty -Obj $manifest -PropertyName 'optional' -DefaultValue @()
    $optList = New-Object System.Collections.Generic.List[string]
    foreach ($o in @($optRaw)) {
      $os = ([string]$o).Trim()
      if ($os.Length -gt 0) { $optList.Add($os) }
    }

    $targetInfo = Resolve-EnvTargetInfo -RepoDir $TargetRepoRoot -ManifestPath $manifestPath -EnvFileSpec $envFileSpec -ExplicitEnvRoot $TargetEnvRoot
    $nodeLabel = if ($nodeVal -is [System.Collections.IEnumerable] -and -not ($nodeVal -is [string])) {
      (@($nodeVal) -join '|')
    } else {
      [string]$nodeVal
    }

    if ($OnlyTargets) {
      $serviceReports.Add([PSCustomObject]@{
        service = $serviceName
        node = $nodeLabel
        manifest = $targetInfo.RelManifest
        envFile = $targetInfo.DisplayEnvFile
        required = @($requiredList.ToArray())
        alternatives = $altMap
        optional = @($optList.ToArray())
      })
      continue
    }

    $envFileExists = Test-Path -LiteralPath $targetInfo.ResolvedEnvPath -PathType Leaf
    $missingEnv = New-Object System.Collections.Generic.List[string]
    $status = 'OK'

    if (-not $envFileExists) {
      $status = 'FILE-MISSING'
      foreach ($reqKey in $requiredList) {
        $missingEnv.Add($reqKey)
      }
    } else {
      $presentKeys = Get-PresentEnvKeyNames -EnvFilePath $targetInfo.ResolvedEnvPath
      foreach ($reqKey in $requiredList) {
        if ($presentKeys.Contains($reqKey)) {
          continue
        }
        $altSatisfied = $false
        if ($altMap.ContainsKey($reqKey)) {
          foreach ($altKey in $altMap[$reqKey]) {
            if ($presentKeys.Contains($altKey)) {
              $altSatisfied = $true
              break
            }
          }
        }
        if (-not $altSatisfied) {
          $missingEnv.Add($reqKey)
        }
      }
      if ($missingEnv.Count -gt 0) {
        $status = 'MISSING'
      }
    }

    if ($status -ne 'OK') {
      $missingServiceCount++
    }

    $serviceReports.Add([PSCustomObject]@{
      service = $serviceName
      node = $nodeLabel
      manifest = $targetInfo.RelManifest
      envFile = $targetInfo.DisplayEnvFile
      envFileExists = $envFileExists
      status = $status
      required = @($requiredList.ToArray())
      missingEnv = @($missingEnv.ToArray())
    })
  }

  $isOk = ($OnlyTargets -or $missingServiceCount -eq 0)
  return [PSCustomObject]@{
    ok = $isOk
    listTargetsOnly = $OnlyTargets
    node = $TargetNode
    missingCount = $missingServiceCount
    services = @($serviceReports.ToArray())
  }
}

function Invoke-EnvNamesCheck {
  param(
    [string]$TargetRepoRoot = $script:EnvCheckRepoRoot,
    [string]$TargetEnvRoot = $script:EnvCheckEnvRoot,
    [string]$TargetNode = $script:EnvCheckNode,
    [bool]$OnlyTargets = $script:EnvCheckListTargetsOnly,
    [bool]$EmitJson = $script:EnvCheckJson
  )

  $report = Get-EnvNamesReport `
    -TargetRepoRoot $TargetRepoRoot `
    -TargetEnvRoot $TargetEnvRoot `
    -TargetNode $TargetNode `
    -OnlyTargets $OnlyTargets

  $script:LastEnvReport = $report

  if ($EmitJson) {
    $jsonOut = ConvertTo-EnvReportJson -IsOk $report.ok -IsListTargetsOnly $report.listTargetsOnly -NodeFilter $report.node -MissingCount $report.missingCount -Services @($report.services)
    Write-Output $jsonOut
  } else {
    foreach ($svc in @($report.services)) {
      if ($OnlyTargets) {
        $reqJoined = if (@($svc.required).Count -gt 0) { @($svc.required) -join ', ' } else { '(none)' }
        Write-Output ("[TARGET] {0} (node={1}) envFile={2} required={3}" -f $svc.service, $svc.node, $svc.envFile, $reqJoined)
      } elseif ($svc.status -eq 'FILE-MISSING') {
        $missJoined = if (@($svc.missingEnv).Count -gt 0) { @($svc.missingEnv) -join ', ' } else { '(none)' }
        Write-Output ("[FILE-MISSING] {0} ({1}): env file not found; missing setting names: {2}" -f $svc.service, $svc.envFile, $missJoined)
      } elseif ($svc.status -eq 'MISSING') {
        Write-Output ("[MISSING] {0} ({1}): missing required setting names: {2}" -f $svc.service, $svc.envFile, (@($svc.missingEnv) -join ', '))
      } else {
        Write-Output ("[OK] {0} ({1}): all {2} required setting names present" -f $svc.service, $svc.envFile, @($svc.required).Count)
      }
    }
  }
}

if (-not $script:EnvCheckNoRun) {
  Invoke-EnvNamesCheck `
    -TargetRepoRoot $script:EnvCheckRepoRoot `
    -TargetEnvRoot $script:EnvCheckEnvRoot `
    -TargetNode $script:EnvCheckNode `
    -OnlyTargets $script:EnvCheckListTargetsOnly `
    -EmitJson $script:EnvCheckJson

  if (-not $script:EnvCheckListTargetsOnly -and $null -ne $script:LastEnvReport -and -not $script:LastEnvReport.ok -and -not $script:EnvCheckSoftExit) {
    exit 1
  }
  exit 0
}

<#
    modswap.ps1 -- install a file-replacement mod over an RPG Maker game, with a backup you can
    actually undo.

    Mods for these games are usually packaged as a mirror of the game's own folder tree, e.g.

        www\data\Items.json
        www\data\Map014.json

    which makes install and uninstall purely mechanical: copy those relative paths in, having first
    copied the originals out. This does that, and records exactly what it touched so the restore is
    precise rather than a guess.

    What it protects against:
      - installing twice and overwriting the pristine backup with already-modded files
      - a mod that ADDS a file (restore has to delete it, not leave it behind)
      - a game update changing a file after you modded it (restore warns instead of silently
        reverting you to a stale version)

    Usage
        .\modswap.ps1                                    # interactive menu
        .\modswap.ps1 -Action status  -Game <dir>
        .\modswap.ps1 -Action install -Game <dir> -Mod <folder-or-zip>
        .\modswap.ps1 -Action restore -Game <dir> -Mod <mod name>

    -Mod accepts a folder or a .zip. RAR is not supported: Windows has no built-in RAR reader, so
    extract it first with 7-Zip or WinRAR and point this at the resulting folder.
#>

[CmdletBinding()]
param(
    [ValidateSet('install', 'restore', 'status', 'patch', 'menu')]
    [string]$Action = 'menu',
    [string]$Game,
    [string]$Mod,
    [string]$Patch,
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$BackupRoot = '_SaveDelver-Backups'

function Info  { param($m) Write-Host $m }
function Good  { param($m) Write-Host $m -ForegroundColor Green }
function Warn  { param($m) Write-Host $m -ForegroundColor Yellow }
function Fail  { param($m) Write-Host $m -ForegroundColor Red }
function Step  { param($m) Write-Host "`n$m" -ForegroundColor Cyan }

function Get-Sha256 {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

# An RPG Maker game is identified by its ENGINE file, not by having a "data" folder -- plenty of
# unrelated games ship one of those (Fallout, RimWorld, half of Command & Conquer), and matching on
# it alone turned a Steam library scan into a list of everything.
$script:EngineFiles = @('www\js\rpg_core.js', 'js\rpg_core.js', 'js\rmmz_core.js', 'www\js\rmmz_core.js')

function Test-RpgMaker {
    param([string]$Full)
    foreach ($e in $script:EngineFiles) {
        if (Test-Path -LiteralPath (Join-Path $Full $e)) { return $true }
    }
    return $false
}

function Resolve-GameRoot {
    param([string]$Path)
    if (-not $Path) { return $null }
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $full = (Resolve-Path -LiteralPath $Path).Path
    if (Test-RpgMaker $full) { return $full }
    # Fall back for an odd install: accept a folder whose data directory holds a System.json,
    # which is still a far stronger signal than the directory merely existing.
    foreach ($d in @('www\data\System.json', 'data\System.json')) {
        if (Test-Path -LiteralPath (Join-Path $full $d)) { return $full }
    }
    return $null
}

# Look through every Steam library for installed RPG Maker games, so the user rarely types a path.
function Find-Games {
    $roots = @()
    $vdfCandidates = @(
        "$env:ProgramFiles\Steam\steamapps\libraryfolders.vdf",
        "${env:ProgramFiles(x86)}\Steam\steamapps\libraryfolders.vdf"
    )
    foreach ($d in @('A', 'B', 'C', 'D', 'E', 'F')) {
        $vdfCandidates += "${d}:\Program Files\Steam\steamapps\libraryfolders.vdf"
        $vdfCandidates += "${d}:\SteamLibrary\steamapps\libraryfolders.vdf"
        $vdfCandidates += "${d}:\Steam\steamapps\libraryfolders.vdf"
    }
    $libs = @()
    foreach ($vdf in ($vdfCandidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $vdf)) { continue }
        $libs += (Split-Path (Split-Path $vdf -Parent) -Parent)
        foreach ($line in (Get-Content -LiteralPath $vdf)) {
            if ($line -match '"path"\s+"(.+?)"') {
                $libs += $matches[1].Replace('\\', '\')
            }
        }
    }
    foreach ($lib in ($libs | Select-Object -Unique)) {
        $common = Join-Path $lib 'steamapps\common'
        if (-not (Test-Path -LiteralPath $common)) { continue }
        foreach ($dir in (Get-ChildItem -LiteralPath $common -Directory -ErrorAction SilentlyContinue)) {
            # Scanning: insist on the engine file. A loose match here lists the whole library.
            if (Test-RpgMaker $dir.FullName) { $roots += $dir.FullName }
        }
    }
    return ($roots | Select-Object -Unique)
}

<#
    Where a loose file belongs.

    RPG Maker's layout is fixed, so a bare Items.json is not ambiguous -- it goes in the data
    directory, which is www\data on MV and data on MZ. That means a mod doesn't have to be
    packaged as a folder tree at all: you can hand this the files themselves and it knows.

    Only routes what it can place with certainty. Art and audio are deliberately NOT routed by
    extension: img\pictures, img\characters, img\faces and a dozen others are all just .png, and
    guessing would put the file somewhere plausible and wrong. Those must come in a tree.
#>
function Get-DataDirName {
    param([string]$GameRoot)
    if (Test-Path -LiteralPath (Join-Path $GameRoot 'www\data')) { return 'www\data' }
    return 'data'
}

function Get-PluginDirName {
    param([string]$GameRoot)
    if (Test-Path -LiteralPath (Join-Path $GameRoot 'www\js\plugins')) { return 'www\js\plugins' }
    return 'js\plugins'
}

# The database files every project has, plus MapNNN / MapInfos.
$script:DataNames = @(
    'System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors',
    'Enemies', 'Troops', 'Animations', 'Tilesets', 'CommonEvents', 'MapInfos'
)

function Get-LooseDestination {
    param([string]$FileName, [string]$GameRoot)
    $base = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $ext = [System.IO.Path]::GetExtension($FileName).ToLower()

    if ($ext -eq '.json') {
        if ($script:DataNames -contains $base -or $base -match '^Map\d+$') {
            return (Join-Path (Get-DataDirName $GameRoot) $FileName)
        }
        return $null   # some other .json -- no idea where it goes
    }
    if ($ext -eq '.js') { return (Join-Path (Get-PluginDirName $GameRoot) $FileName) }
    return $null       # images, audio, anything else: too many possible homes to guess
}

# The mod's payload as a list of paths relative to the game root.
function Get-ModFiles {
    param([string]$ModPath, [string]$GameRoot)
    $src = $ModPath
    $temp = $null
    if ($ModPath -match '\.zip$') {
        $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("modswap-" + [System.Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $temp -Force | Out-Null
        Expand-Archive -LiteralPath $ModPath -DestinationPath $temp -Force
        $src = $temp
    }
    if ($ModPath -match '\.rar$') {
        throw "RAR archives can't be read by Windows on their own. Extract '$ModPath' with 7-Zip or WinRAR, then point -Mod at the extracted folder."
    }
    if (-not (Test-Path -LiteralPath $src)) { throw "Mod path not found: $ModPath" }

    # Mods are sometimes wrapped in one extra folder; step into it so the tree lines up with the game.
    $root = (Resolve-Path -LiteralPath $src).Path
    while ($true) {
        $entries = @(Get-ChildItem -LiteralPath $root -Force)
        $hasPayload = $entries | Where-Object { $_.Name -in @('www', 'data', 'js', 'img', 'audio') }
        if ($hasPayload) { break }
        $dirs = @($entries | Where-Object { $_.PSIsContainer })
        if ($dirs.Count -eq 1 -and $entries.Count -eq 1) { $root = $dirs[0].FullName; continue }
        break
    }

    # Does this look like a game-root mirror, or a loose pile of files?
    $hasTree = @(Get-ChildItem -LiteralPath $root -Force |
        Where-Object { $_.PSIsContainer -and $_.Name -in @('www', 'data', 'js', 'img', 'audio') }).Count -gt 0

    $files = @()
    $unplaced = @()
    foreach ($f in (Get-ChildItem -LiteralPath $root -Recurse -File -Force)) {
        $rel = $f.FullName.Substring($root.Length).TrimStart('\')
        if (-not $hasTree -and $rel -eq $f.Name) {
            # Loose file sitting at the top of the mod folder -- place it by name.
            $dest = Get-LooseDestination $f.Name $GameRoot
            if (-not $dest) { $unplaced += $f.Name; continue }
            $files += [pscustomobject]@{ Rel = $dest; Full = $f.FullName; Size = $f.Length; Routed = $true }
            continue
        }
        $files += [pscustomobject]@{ Rel = $rel; Full = $f.FullName; Size = $f.Length; Routed = $false }
    }
    return [pscustomobject]@{ Root = $root; Files = $files; Temp = $temp; Unplaced = $unplaced; Loose = (-not $hasTree) }
}

<#
    Patches: an edit applied to the player's OWN files, shipping no game content.

    A mod normally arrives as modified copies of the game's data files, which means redistributing
    the game's content. For a small change that is unnecessary: describe the edit instead, read the
    player's file, apply it, and hand the result to the ordinary install path. The backup, manifest
    and restore machinery then works exactly as it does for a real mod, and nothing copyrighted has
    to be hosted or handed around.

    A patch declares `expect`, the value it believes is there now. If the file does not match, the
    patch refuses rather than writing -- that catches a game update, a different version, or a
    patch already applied.
#>
function Get-PatchList {
    $dir = Join-Path $PSScriptRoot 'patches'
    if (-not (Test-Path -LiteralPath $dir)) { return @() }
    $out = @()
    foreach ($f in (Get-ChildItem -LiteralPath $dir -Filter *.json -File)) {
        try { $p = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json } catch { continue }
        $p | Add-Member -NotePropertyName _file -NotePropertyValue $f.FullName -Force
        $out += $p
    }
    return $out
}

# Walk a dotted path (menuCommands.5) into a parsed JSON object and read or write the leaf.
function Resolve-JsonPath {
    param($Root, [string]$Path)
    $parts = $Path.Split('.')
    $node = $Root
    for ($i = 0; $i -lt $parts.Count - 1; $i++) {
        if ($null -eq $node) { return $null }
        $k = $parts[$i]
        if ($k -match '^\d+$') { $node = $node[[int]$k] } else { $node = $node.$k }
    }
    return [pscustomobject]@{ Parent = $node; Key = $parts[$parts.Count - 1] }
}
function Get-JsonValue { param($Root, [string]$Path)
    $r = Resolve-JsonPath $Root $Path
    if (-not $r -or $null -eq $r.Parent) { return $null }
    if ($r.Key -match '^\d+$') { return $r.Parent[[int]$r.Key] }
    return $r.Parent.($r.Key)
}
function Set-JsonValue { param($Root, [string]$Path, $Value)
    $r = Resolve-JsonPath $Root $Path
    if ($r.Key -match '^\d+$') { $r.Parent[[int]$r.Key] = $Value } else { $r.Parent.($r.Key) = $Value }
}

function Get-ManifestPath {
    param([string]$GameRoot, [string]$ModName)
    return (Join-Path $GameRoot "$BackupRoot\$ModName\manifest.json")
}

function Show-Status {
    param([string]$GameRoot)
    $bdir = Join-Path $GameRoot $BackupRoot
    Step "Status of: $GameRoot"
    if (-not (Test-Path -LiteralPath $bdir)) { Info '  No mods installed by this tool.'; return }
    $any = $false
    foreach ($d in (Get-ChildItem -LiteralPath $bdir -Directory -ErrorAction SilentlyContinue)) {
        $mf = Join-Path $d.FullName 'manifest.json'
        if (-not (Test-Path -LiteralPath $mf)) { continue }
        $any = $true
        $m = Get-Content -LiteralPath $mf -Raw | ConvertFrom-Json
        Info "  [$($m.mod)] installed $($m.installedAt) - $($m.files.Count) file(s)"
        foreach ($f in $m.files) {
            $target = Join-Path $GameRoot $f.rel
            $now = Get-Sha256 $target
            $state = 'MODIFIED SINCE (game updated?)'
            if ($now -eq $f.modSha256)       { $state = 'modded' }
            elseif ($now -eq $f.origSha256)  { $state = 'original (already restored)' }
            elseif ($null -eq $now)          { $state = 'missing' }
            Info ("     {0,-34} {1}" -f $f.rel, $state)
        }
    }
    if (-not $any) { Info '  No mods installed by this tool.' }
}

function Install-Mod {
    param([string]$GameRoot, [string]$ModPath, [string]$NameOverride)
    $info = Get-ModFiles $ModPath $GameRoot
    try {
        # A patch stages into a temp folder, so it passes its own name rather than inheriting a GUID.
        $modName = $NameOverride
        if (-not $modName) { $modName = [System.IO.Path]::GetFileNameWithoutExtension($ModPath.TrimEnd('\')) }
        if (-not $modName) { $modName = 'mod' }
        $backupDir = Join-Path $GameRoot "$BackupRoot\$modName"
        $manifestPath = Get-ManifestPath $GameRoot $modName

        Step "Installing '$modName' into $GameRoot"
        if ($info.Loose) {
            Info "  Loose files -- routed by name into this game's own layout."
        }
        if ($info.Unplaced.Count -gt 0) {
            Warn "  Can't place these by name alone, so they are being SKIPPED:"
            foreach ($u in $info.Unplaced) { Warn "     $u" }
            Warn "  Art and audio need the folder they belong in (img\pictures vs img\characters and"
            Warn "  so on are all .png). Put them in a www\... tree and re-run."
        }
        if ($info.Files.Count -eq 0) { Fail '  Nothing to install.'; return }

        if ((Test-Path -LiteralPath $manifestPath) -and -not $Force) {
            Warn "  '$modName' is already installed."
            Warn "  Restore it first, or re-run with -Force. Refusing so the pristine backup isn't"
            Warn "  overwritten with already-modded files."
            return
        }

        # Preview before touching anything.
        $plan = @()
        foreach ($f in $info.Files) {
            $target = Join-Path $GameRoot $f.Rel
            $existed = Test-Path -LiteralPath $target
            $plan += [pscustomobject]@{ Rel = $f.Rel; Full = $f.Full; Target = $target; Existed = $existed }
            $verb = 'ADD (new file)'
            if ($existed) { $verb = 'replace' }
            $note = ''
            if ($f.Routed) { $note = "   <- $([System.IO.Path]::GetFileName($f.Full))" }
            Info ("  {0,-14} {1}{2}" -f $verb, $f.Rel, $note)
        }
        if ($DryRun) { Warn '  -DryRun: nothing was written.'; return }

        $manifest = [ordered]@{
            mod = $modName; game = $GameRoot; source = (Resolve-Path -LiteralPath $ModPath).Path
            installedAt = (Get-Date).ToString('s'); files = @()
        }

        New-Item -ItemType Directory -Path (Split-Path $manifestPath -Parent) -Force | Out-Null
        $writeManifest = {
            $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8
        }

        <#  Order per file: back the original up, THEN overwrite it, THEN record it -- and rewrite
            the manifest each time round. Writing it only at the end meant a failure halfway
            (denied permission, full disk) left the originals sitting in the backup folder with
            nothing describing them, so restore reported nothing to do and you were copying files
            back by hand. Rewriting a few-KB manifest per file costs nothing and makes a
            half-finished install as recoverable as a finished one. #>
        $done = 0
        try {
            foreach ($p in $plan) {
                $entry = [ordered]@{ rel = $p.Rel; existedBefore = $p.Existed; origSha256 = $null; origSize = 0; modSha256 = $null }
                if ($p.Existed) {
                    $bkp = Join-Path $backupDir $p.Rel
                    New-Item -ItemType Directory -Path (Split-Path $bkp -Parent) -Force | Out-Null
                    # Never clobber an existing pristine backup, even under -Force.
                    if (-not (Test-Path -LiteralPath $bkp)) { Copy-Item -LiteralPath $p.Target -Destination $bkp -Force }
                    $entry.origSha256 = Get-Sha256 $bkp
                    $entry.origSize = (Get-Item -LiteralPath $bkp).Length
                    # Record the backup before touching the original, so an interruption between
                    # these two lines still leaves a manifest that can put it back.
                    $manifest.files += $entry
                    & $writeManifest
                } else {
                    $manifest.files += $entry
                }
                New-Item -ItemType Directory -Path (Split-Path $p.Target -Parent) -Force | Out-Null
                Copy-Item -LiteralPath $p.Full -Destination $p.Target -Force
                $entry.modSha256 = Get-Sha256 $p.Target
                & $writeManifest
                $done++
            }
        }
        catch [System.UnauthorizedAccessException] {
            & $writeManifest
            Fail "  Access denied writing into the game folder."
            Fail "  Games under Program Files sometimes need elevation: right-click the .bat and"
            Fail "  choose 'Run as administrator', then try again."
            Warn "  $done of $($plan.Count) file(s) were swapped. The manifest is written, so"
            Warn "  -Action restore will put those back."
            return
        }
        catch {
            & $writeManifest
            Fail "  Failed after $done of $($plan.Count) file(s): $($_.Exception.Message)"
            Warn "  The manifest is written, so -Action restore will undo what did happen."
            return
        }

        & $writeManifest
        Good "  Installed $($plan.Count) file(s)."
        Good "  Originals kept in: $backupDir"
        Info  "  Undo any time with:  .\modswap.ps1 -Action restore -Game `"$GameRoot`" -Mod `"$modName`""
    }
    finally {
        if ($info.Temp -and (Test-Path -LiteralPath $info.Temp)) { Remove-Item -LiteralPath $info.Temp -Recurse -Force }
    }
}

function Apply-Patch {
    param([string]$GameRoot, $Patch)
    Step "Patch '$($Patch.name)' -- $($Patch.title)"
    foreach ($line in $Patch.why) { Info ("  " + $line) }

    $dataDir = Get-DataDirName $GameRoot
    $staged = Join-Path ([System.IO.Path]::GetTempPath()) ("patch-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $staged -Force | Out-Null
    try {
        $any = $false
        foreach ($edit in $Patch.edits) {
            $rel = $edit.file.Replace('{data}', $dataDir).Replace('/', '\')
            $target = Join-Path $GameRoot $rel
            if (-not (Test-Path -LiteralPath $target)) { Fail "  missing: $rel"; return }

            $json = Get-Content -LiteralPath $target -Raw | ConvertFrom-Json
            $current = Get-JsonValue $json $edit.path

            Write-Host ''
            Info ("  " + $rel)
            Info ("    " + $edit.describe)
            Info ("    currently: " + (ConvertTo-Json $current -Compress))

            if ($null -ne $edit.expect -and (ConvertTo-Json $current -Compress) -ne (ConvertTo-Json $edit.expect -Compress)) {
                if ((ConvertTo-Json $current -Compress) -eq (ConvertTo-Json $edit.value -Compress)) {
                    Warn '    already set to the patched value -- nothing to do.'
                } else {
                    Fail '    does not match what this patch expects, so it will NOT be applied.'
                    Fail '    Your game may be a different version, or already modified.'
                }
                continue
            }

            Set-JsonValue $json $edit.path $edit.value
            $out = Join-Path $staged $rel
            New-Item -ItemType Directory -Path (Split-Path $out -Parent) -Force | Out-Null
            <#  Write UTF-8 with NO byte-order mark. PowerShell 5.1's `Set-Content -Encoding utf8`
                emits a BOM; RPG Maker's own data files have none, and a BOM in front of the JSON
                makes the game's JSON.parse throw on load. This one detail is the difference
                between a working patch and a game that won't start. #>
            $text = ConvertTo-Json $json -Depth 100 -Compress
            [System.IO.File]::WriteAllText($out, $text, (New-Object System.Text.UTF8Encoding($false)))
            $any = $true
        }
        if (-not $any) { Warn "`n  Nothing to apply."; return }

        Write-Host ''
        # Hand off to the ordinary install path so backup, manifest and restore behave identically.
        Install-Mod $GameRoot $staged $Patch.name
    }
    finally { if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged -Recurse -Force } }
}

function Restore-Mod {
    param([string]$GameRoot, [string]$ModName)
    $manifestPath = Get-ManifestPath $GameRoot $ModName
    Step "Restoring '$ModName' in $GameRoot"
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        Fail "  No backup manifest for '$ModName'. Nothing to restore."
        return
    }
    $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $backupDir = Split-Path $manifestPath -Parent
    $restored = 0; $removed = 0; $skipped = 0

    foreach ($f in $m.files) {
        $target = Join-Path $GameRoot $f.rel
        $now = Get-Sha256 $target
        if ($now -and $now -ne $f.modSha256 -and $now -ne $f.origSha256 -and -not $Force) {
            Warn "  skipped  $($f.rel)"
            Warn "           it has changed since the mod was installed (a game update?)."
            Warn "           Re-run with -Force to overwrite it with the backup anyway."
            $skipped++
            continue
        }
        if (-not $f.existedBefore) {
            # The mod added this file; restoring means taking it away again.
            if (Test-Path -LiteralPath $target) { if (-not $DryRun) { Remove-Item -LiteralPath $target -Force }; $removed++; Info "  removed  $($f.rel)" }
            continue
        }
        $bkp = Join-Path $backupDir $f.rel
        if (-not (Test-Path -LiteralPath $bkp)) { Fail "  MISSING backup for $($f.rel) - left alone."; $skipped++; continue }
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
            Copy-Item -LiteralPath $bkp -Destination $target -Force
        }
        $restored++
        Info "  restored $($f.rel)"
    }

    if ($DryRun) { Warn '  -DryRun: nothing was written.'; return }
    if ($skipped -eq 0) {
        # Keep the backup files; only drop the manifest so the mod reads as uninstalled.
        Remove-Item -LiteralPath $manifestPath -Force
        Good "  Restored $restored file(s), removed $removed added file(s). '$ModName' is uninstalled."
        Info  "  The backup copies are still in $backupDir - delete that folder yourself if you want it gone."
    } else {
        Warn "  Restored $restored, removed $removed, skipped $skipped. Manifest kept because of the skips."
    }
}

# Everything the action menu does for one game. Loops until the user backs out, so a wrong
# keypress doesn't drop you out of the program.
function Show-GameMenu {
    param([string]$GameRoot)
    while ($true) {
        Show-Status $GameRoot
        Write-Host ''
        Write-Host '   1) Install a mod (backs up the originals first)'
        Write-Host '   2) Restore originals (uninstall a mod)'
        Write-Host '   3) Show status again'
        Write-Host '   4) Apply a built-in patch (edits your own files, ships nothing)'
        Write-Host '   5) Pick a different game'
        Write-Host '   6) Quit'
        $what = Read-Host "`n  Choose"

        if ($what -eq '1') {
            $modPath = (Read-Host '  Path to the mod folder or .zip (blank to cancel)').Trim('"')
            if ($modPath) {
                try { Install-Mod $GameRoot $modPath }
                catch { Fail "  $($_.Exception.Message)" }
            }
        }
        elseif ($what -eq '2') {
            $bdir = Join-Path $GameRoot $BackupRoot
            $mods = @()
            if (Test-Path -LiteralPath $bdir) {
                $mods = @(Get-ChildItem -LiteralPath $bdir -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'manifest.json') })
            }
            if ($mods.Count -eq 0) { Fail '  Nothing is installed.' }
            else {
                for ($i = 0; $i -lt $mods.Count; $i++) { Write-Host ("   {0}) {1}" -f ($i + 1), $mods[$i].Name) }
                $mp = Read-Host '  Which mod? (number, blank to cancel)'
                $mi = 0
                if ($mp -and [int]::TryParse($mp, [ref]$mi) -and $mi -ge 1 -and $mi -le $mods.Count) {
                    try { Restore-Mod $GameRoot $mods[$mi - 1].Name }
                    catch { Fail "  $($_.Exception.Message)" }
                } elseif ($mp) { Fail '  Not a valid choice.' }
            }
        }
        elseif ($what -eq '4') {
            # Offer only the patches that declare themselves valid for this game.
            $leaf = (Split-Path $GameRoot -Leaf)
            $all = @(Get-PatchList)
            $ok = @($all | Where-Object {
                $ids = $_.appliesTo
                if (-not $ids) { return $true }
                foreach ($id in $ids) { if ($leaf -replace '[^a-zA-Z0-9]', '' -match ($id -replace '[^a-zA-Z0-9]', '')) { return $true } }
                return $false
            })
            if ($all.Count -eq 0) { Fail '  No patches found in tools\patches.' }
            elseif ($ok.Count -eq 0) { Fail "  None of the $($all.Count) built-in patches apply to this game." }
            else {
                for ($i = 0; $i -lt $ok.Count; $i++) { Write-Host ("   {0}) {1}" -f ($i + 1), $ok[$i].title) }
                $pp = Read-Host '  Which patch? (number, blank to cancel)'
                $pi = 0
                if ($pp -and [int]::TryParse($pp, [ref]$pi) -and $pi -ge 1 -and $pi -le $ok.Count) {
                    try { Apply-Patch $GameRoot $ok[$pi - 1] } catch { Fail "  $($_.Exception.Message)" }
                } elseif ($pp) { Fail '  Not a valid choice.' }
            }
        }
        elseif ($what -eq '5') { return 'back' }
        elseif ($what -eq '6') { return 'quit' }
        elseif ($what -ne '3') { Fail '  Not a valid choice.' }
    }
}

function Show-Menu {
    Write-Host ''
    Write-Host '  SaveDelver mod swapper' -ForegroundColor Cyan
    Write-Host '  ----------------------'
    $games = @(Find-Games)

    while ($true) {
        if ($games.Count -eq 0) {
            Fail '  No RPG Maker games found automatically.'
            $g = (Read-Host '  Paste the game folder path (blank to quit)').Trim('"')
            if (-not $g) { return }
            $games = @($g)
        }

        Write-Host ''
        for ($i = 0; $i -lt $games.Count; $i++) { Write-Host ("   {0}) {1}" -f ($i + 1), $games[$i]) }
        Write-Host ("   {0}) Type a folder path instead" -f ($games.Count + 1))
        Write-Host ("   {0}) Quit" -f ($games.Count + 2))
        $pick = Read-Host "`n  Which game? (number)"
        $idx = 0
        if (-not [int]::TryParse($pick, [ref]$idx)) { Fail '  Not a valid choice.'; continue }

        if ($idx -eq $games.Count + 2) { return }
        if ($idx -eq $games.Count + 1) {
            $g = (Read-Host '  Paste the game folder path (blank to cancel)').Trim('"')
            if (-not $g) { continue }
            $root = Resolve-GameRoot $g
            if (-not $root) { Fail "  That doesn't look like an RPG Maker game folder."; continue }
            if ((Show-GameMenu $root) -eq 'quit') { return }
            continue
        }
        if ($idx -lt 1 -or $idx -gt $games.Count) { Fail '  Not a valid choice.'; continue }

        $gameRoot = Resolve-GameRoot $games[$idx - 1]
        if (-not $gameRoot) { Fail "  That doesn't look like an RPG Maker game folder."; continue }
        if ((Show-GameMenu $gameRoot) -eq 'quit') { return }
    }
}

# ---------------- entry ----------------
if ($Action -eq 'menu') {
    Show-Menu
} else {
    $gameRoot = Resolve-GameRoot $Game
    if (-not $gameRoot) {
        Fail "Not an RPG Maker game folder: $Game"
        Fail "Expected one of www\js\rpg_core.js, js\rmmz_core.js, or a data\System.json inside it."
        exit 1
    }
    switch ($Action) {
        'status'  { Show-Status $gameRoot }
        'install' { if (-not $Mod) { Fail 'Need -Mod <folder or .zip>'; exit 1 }; Install-Mod $gameRoot $Mod }
        'restore' { if (-not $Mod) { Fail 'Need -Mod <mod name>'; exit 1 }; Restore-Mod $gameRoot $Mod }
        'patch'   {
            if (-not $Patch) { Fail 'Need -Patch <name>. Available:'; Get-PatchList | ForEach-Object { Fail ("   " + $_.name + '  -- ' + $_.title) }; exit 1 }
            $sel = Get-PatchList | Where-Object { $_.name -eq $Patch }
            if (-not $sel) { Fail "No such patch: $Patch"; exit 1 }
            Apply-Patch $gameRoot $sel
        }
    }
}

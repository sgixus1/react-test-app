param(
  [Parameter(Mandatory=$true)]
  [string]$Root,

  [string]$Output = ".\\import\\source-files.json",

  [switch]$HashAll
)

$ErrorActionPreference = "Stop"

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\\")
$items = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse -Force

function Get-ArcanumRelativePath {
  param(
    [Parameter(Mandatory=$true)][string]$BasePath,
    [Parameter(Mandatory=$true)][string]$FullPath
  )

  $base = $BasePath.TrimEnd("\\")
  $full = $FullPath

  if ($full.Length -gt $base.Length -and $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($base.Length).TrimStart("\\").Replace("\\", "/")
  }

  $baseUri = New-Object System.Uri(($base + "\\"))
  $fullUri = New-Object System.Uri($full)
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace("\\", "/")
}

$result = foreach ($item in $items) {
  $relative = Get-ArcanumRelativePath -BasePath $resolvedRoot -FullPath $item.FullName

  $ext = $item.Extension.ToLowerInvariant()
  $shouldHash = $HashAll -or $ext -in @(
    ".pdf",".doc",".docx",".txt",".rtf",".md",
    ".png",".jpg",".jpeg",".webp",".gif",".tif",".tiff",".bmp",".svg",
    ".epub",".mobi",".rar",".zip",".7z"
  )

  $sha = $null
  if ($shouldHash) {
    try {
      $sha = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    } catch {
      Write-Warning "Could not hash: $($item.FullName)"
    }
  }

  [ordered]@{
    path = $relative
    size = [int64]$item.Length
    sha256 = $sha
    mime = $null
    modified = $item.LastWriteTimeUtc.ToString("o")
  }
}

$parent = Split-Path -Parent $Output
if ($parent -and -not (Test-Path $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Output -Encoding UTF8

Write-Host ""
Write-Host "Arcanum source scan complete." -ForegroundColor Green
Write-Host "Root:   $resolvedRoot"
Write-Host "Files:  $($result.Count)"
Write-Host "Output: $Output"
Write-Host ""
Write-Host "Next:"
Write-Host ('  node tools/import-arcanum-sources.mjs "' + $Output + '"')

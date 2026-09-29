param(
  [Parameter(Mandatory=$true)]
  [string]$Root,

  [string]$Output = ".\\import\\source-files.json",

  [switch]$HashAll
)

$ErrorActionPreference = "Stop"

$resolvedRoot = (Resolve-Path $Root).Path
$items = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse -Force

$result = foreach ($item in $items) {
  $relative = [System.IO.Path]::GetRelativePath($resolvedRoot, $item.FullName).Replace("\\", "/")

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

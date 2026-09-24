param(
    [Parameter(Mandatory = $true)]
    [string]$InputDocx,

    [Parameter(Mandatory = $true)]
    [string]$OutputPdf,

    [switch]$ConfirmPublicSafeSource
)

if (-not $ConfirmPublicSafeSource) {
    throw "Public resume export stopped. Use a source copy with the phone number removed and the location generalized, then rerun with -ConfirmPublicSafeSource."
}

$resolvedInput = (Resolve-Path -LiteralPath $InputDocx).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPdf)

if ([System.IO.Path]::GetExtension($resolvedInput) -ne ".docx") {
    throw "Input must be a .docx file."
}

if ([System.IO.Path]::GetExtension($resolvedOutput) -ne ".pdf") {
    throw "Output must be a .pdf file."
}

$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$word = $null
$document = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($resolvedInput, $false, $true)
    $document.ExportAsFixedFormat($resolvedOutput, 17)
    Write-Warning "Export complete. Before publishing, extract and review the PDF text for phone numbers, precise location, private email addresses, and confidential employer content."
    Write-Output $resolvedOutput
}
finally {
    if ($null -ne $document) { $document.Close($false) }
    if ($null -ne $word) { $word.Quit() }
}

param(
    [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$siteRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Portfolio available at http://127.0.0.1:$Port/"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".svg" = "image/svg+xml"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".pdf" = "application/pdf"
    ".txt" = "text/plain; charset=utf-8"
}

try {
    while ($true) {
        $client = $null
        $reader = $null
        $stream = $null

        try {
            $client = $listener.AcceptTcpClient()
            $client.ReceiveTimeout = 1500
            $client.SendTimeout = 30000
            $stream = $client.GetStream()
            $stream.ReadTimeout = 1500
            $stream.WriteTimeout = 30000
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $rawPath = if ($parts.Length -gt 1) { $parts[1].Split("?")[0] } else { "/" }
            while (-not [string]::IsNullOrEmpty($reader.ReadLine())) { }

            $requestPath = [System.Uri]::UnescapeDataString($rawPath.TrimStart("/"))
            if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.html" }
            $candidatePath = Join-Path $siteRoot $requestPath
            $resolvedPath = [System.IO.Path]::GetFullPath($candidatePath)

            if (-not $resolvedPath.StartsWith($siteRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                if ($method -ne "HEAD") { $stream.Write($body, 0, $body.Length) }
                continue
            }

            if (Test-Path -LiteralPath $resolvedPath -PathType Container) {
                $resolvedPath = Join-Path $resolvedPath "index.html"
            }

            if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
                $notFoundPath = Join-Path $siteRoot "404.html"
                if (Test-Path -LiteralPath $notFoundPath -PathType Leaf) {
                    $body = [System.IO.File]::ReadAllBytes($notFoundPath)
                    $notFoundType = "text/html; charset=utf-8"
                }
                else {
                    $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                    $notFoundType = "text/plain; charset=utf-8"
                }
                $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Type: $notFoundType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                if ($method -ne "HEAD") { $stream.Write($body, 0, $body.Length) }
                continue
            }

            $extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
            $headerText = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD") {
                $offset = 0
                while ($offset -lt $bytes.Length) {
                    $chunkLength = [Math]::Min(65536, $bytes.Length - $offset)
                    $stream.Write($bytes, $offset, $chunkLength)
                    $offset += $chunkLength
                }
            }
            $stream.Flush()
        }
        catch [System.IO.IOException] {
            Write-Warning "Dropped an incomplete or timed-out local request."
        }
        finally {
            if ($null -ne $client) { $client.Close() }
        }
    }
}
finally {
    $listener.Stop()
}

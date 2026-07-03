$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function ConvertFrom-SecureToPlain([Security.SecureString]$SecureValue) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function New-Base64UrlSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Find-WorkerUrl([string]$Text) {
  $match = [regex]::Match($Text, 'https://[a-zA-Z0-9.-]+\.workers\.dev')
  if ($match.Success) { return $match.Value.TrimEnd('/') }
  return ''
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'Не найден Node.js/npm. Установите Node.js LTS и повторите запуск.'
}

Write-Host 'Устанавливаем Wrangler...' -ForegroundColor Cyan
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw 'Не удалось установить Wrangler.' }

Write-Host 'Проверяем вход в Cloudflare...' -ForegroundColor Cyan
& npx.cmd wrangler whoami *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Сейчас откроется вход Cloudflare. Подтвердите его в браузере.' -ForegroundColor Yellow
  & npx.cmd wrangler login
  if ($LASTEXITCODE -ne 0) { throw 'Вход Cloudflare не завершён.' }
}

Write-Host 'Создаём Worker и получаем постоянный адрес...' -ForegroundColor Cyan
$firstDeploy = & npx.cmd wrangler deploy 2>&1 | Tee-Object -Variable firstDeployOutput
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать Cloudflare Worker.' }
$workerUrl = Find-WorkerUrl (($firstDeployOutput | Out-String))
if (-not $workerUrl) { throw 'Worker создан, но URL не удалось определить автоматически.' }

$secureClientSecret = Read-Host 'Вставьте Google OAuth Client Secret' -AsSecureString
$clientSecret = ConvertFrom-SecureToPlain $secureClientSecret
if ([string]::IsNullOrWhiteSpace($clientSecret)) { throw 'Google Client Secret не указан.' }

$encryptionKey = New-Base64UrlSecret 32
$stateKey = New-Base64UrlSecret 48

Write-Host 'Сохраняем закрытые значения в Cloudflare...' -ForegroundColor Cyan
$clientSecret | & npx.cmd wrangler secret put GOOGLE_CLIENT_SECRET
if ($LASTEXITCODE -ne 0) { throw 'Не удалось сохранить GOOGLE_CLIENT_SECRET.' }
$encryptionKey | & npx.cmd wrangler secret put TOKEN_ENCRYPTION_KEY
if ($LASTEXITCODE -ne 0) { throw 'Не удалось сохранить TOKEN_ENCRYPTION_KEY.' }
$stateKey | & npx.cmd wrangler secret put STATE_HMAC_KEY
if ($LASTEXITCODE -ne 0) { throw 'Не удалось сохранить STATE_HMAC_KEY.' }

Write-Host 'Публикуем итоговую защищённую версию Worker...' -ForegroundColor Cyan
& npx.cmd wrangler deploy
if ($LASTEXITCODE -ne 0) { throw 'Итоговый Cloudflare Worker не развернулся.' }

$redirectUri = "$workerUrl/auth/callback"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$configPath = Join-Path $repoRoot 'pmk-google-auth-config.json'
$config = [ordered]@{
  enabled = $true
  apiUrl = $workerUrl
  label = 'Постоянный вход Google'
}
$config | ConvertTo-Json | Set-Content -Path $configPath -Encoding UTF8

Set-Clipboard -Value $redirectUri
Write-Host ''
Write-Host 'СЕРВЕР ГОТОВ' -ForegroundColor Green
Write-Host "Worker: $workerUrl"
Write-Host "Redirect URI скопирован: $redirectUri" -ForegroundColor Yellow
Write-Host 'Откройте Google Cloud Console, добавьте этот URI в Authorized redirect URIs и сохраните.'
Start-Process 'https://console.cloud.google.com/apis/credentials'

$gitRoot = Join-Path $repoRoot '.git'
if ((Test-Path $gitRoot) -and (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  Push-Location $repoRoot
  try {
    git.exe add pmk-google-auth-config.json
    git.exe commit -m 'Enable persistent Google auth'
    if ($LASTEXITCODE -eq 0) {
      git.exe push
      if ($LASTEXITCODE -eq 0) {
        Write-Host 'Конфигурация опубликована в GitHub.' -ForegroundColor Green
      } else {
        Write-Host 'Файл обновлён локально, но git push не выполнен. Опубликуйте изменения вручную.' -ForegroundColor Yellow
      }
    } else {
      Write-Host 'Файл конфигурации уже актуален или commit не создан.' -ForegroundColor Yellow
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "Файл $configPath обновлён. Опубликуйте его в GitHub." -ForegroundColor Green
}

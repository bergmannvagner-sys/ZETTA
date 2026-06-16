param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$Email = $env:ZETTA_AUTH_SMOKE_EMAIL,
  [string]$Password = $env:ZETTA_AUTH_SMOKE_PASSWORD,
  [string]$FullName = $env:ZETTA_AUTH_SMOKE_FULL_NAME,
  [string]$Document = $env:ZETTA_AUTH_SMOKE_DOCUMENT,
  [string]$EmailDomain = "example.com"
)

$ErrorActionPreference = "Stop"

function Fail {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{},
    [int[]]$AllowedStatus = @(200, 201)
  )

  $params = @{
    Method = $Method
    Uri = "$ApiUrl$Path"
    UseBasicParsing = $true
    TimeoutSec = 45
    Headers = $Headers
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
    $params.ContentType = "application/json"
  }

  try {
    return Invoke-RestMethod @params
  } catch {
    $response = $_.Exception.Response
    if ($null -ne $response -and $AllowedStatus -contains [int]$response.StatusCode) {
      return $null
    }
    throw
  }
}

function Invoke-JsonRetry {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{},
    [int[]]$AllowedStatus = @(200, 201),
    [int]$Retries = 2
  )

  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try {
      return Invoke-Json -Method $Method -Path $Path -Body $Body -Headers $Headers -AllowedStatus $AllowedStatus
    } catch {
      $response = $_.Exception.Response
      $statusCode = if ($null -ne $response) { [int]$response.StatusCode } else { $null }
      $transientStatus = @(502, 503, 504, 520)
      if ($attempt -lt $Retries -and ($null -eq $statusCode -or $transientStatus -contains $statusCode)) {
        Start-Sleep -Seconds ([Math]::Min(2 * ($attempt + 1), 5))
        continue
      }
      throw
    }
  }
}

function Assert-Equal {
  param([object]$Actual, [object]$Expected, [string]$Label)
  if ($Actual -ne $Expected) {
    Fail "$Label expected '$Expected', got '$Actual'."
  }
}

function New-Cpf {
  $digits = New-Object System.Collections.Generic.List[int]
  for ($i = 0; $i -lt 9; $i++) {
    $digits.Add((Get-Random -Minimum 0 -Maximum 10))
  }
  if (($digits | Select-Object -Unique).Count -eq 1) {
    $digits[8] = ($digits[8] + 1) % 10
  }

  $sum = 0
  for ($i = 0; $i -lt 9; $i++) {
    $sum += $digits[$i] * (10 - $i)
  }
  $first = ($sum * 10) % 11
  if ($first -eq 10) { $first = 0 }
  $digits.Add($first)

  $sum = 0
  for ($i = 0; $i -lt 10; $i++) {
    $sum += $digits[$i] * (11 - $i)
  }
  $second = ($sum * 10) % 11
  if ($second -eq 10) { $second = 0 }
  $digits.Add($second)

  return ($digits -join "")
}

if (-not $ApiUrl) {
  $ApiUrl = "https://zetta-bergmann.onrender.com"
}
$ApiUrl = $ApiUrl.TrimEnd("/")

$runId = Get-Date -Format "yyyyMMddHHmmss"
if (-not $Email) {
  $Email = "qa-auth-$runId@$EmailDomain"
}
if (-not $Password) {
  $Password = "ZettaAuth$runId!"
}
if (-not $FullName) {
  $FullName = "QA Auth Smoke"
}
if (-not $Document) {
  $Document = New-Cpf
}

Write-Host "ZETTA production auth smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Email: $Email"

Invoke-JsonRetry -Method GET -Path "/health" | Out-Null
Write-Host "health: ok"

$registration = Invoke-JsonRetry -Method POST -Path "/auth/register" -Body @{
  email = $Email
  full_name = $FullName
  password = $Password
  role = "USER"
  document = $Document
  lgpdConsent = $true
}

Assert-Equal $registration.user.role "USER" "user role"
Assert-Equal $registration.user.status "ACTIVE" "user status"
Assert-Equal $registration.user.document_type "CPF" "document type"
Assert-Equal $registration.user.subscription_status "FREE" "subscription status"
Write-Host "register: ok"

$duplicateEmail = "qa-auth-dup-$runId@$EmailDomain"
$duplicate = Invoke-JsonRetry -Method POST -Path "/auth/register" -Body @{
  email = $duplicateEmail
  full_name = "QA Auth Duplicate"
  password = $Password
  role = "USER"
  document = $Document
  lgpdConsent = $true
} -AllowedStatus @(409)

if ($null -ne $duplicate) {
  Fail "Duplicate document registration unexpectedly succeeded."
}
Write-Host "duplicate document blocked: ok"

$login = Invoke-JsonRetry -Method POST -Path "/auth/login" -Body @{
  email = $Email
  password = $Password
}

Assert-Equal $login.user.email $Email "login email"
Assert-Equal $login.user.role "USER" "login role"
Assert-Equal $login.user.status "ACTIVE" "login status"
if (-not $login.access_token -or -not $login.refresh_token) {
  Fail "Login did not return both tokens."
}
Write-Host "login: ok"

$me = Invoke-JsonRetry -Method GET -Path "/users/me" -Headers @{ Authorization = "Bearer $($login.access_token)" }
Assert-Equal $me.email $Email "/users/me email"
Write-Host "users/me: ok"

$archive = Invoke-JsonRetry -Method POST -Path "/privacy/account/archive" -Headers @{ Authorization = "Bearer $($login.access_token)" }
Assert-Equal $archive.archived $true "archive status"
Write-Host "cleanup archive: ok"

$blockedLogin = Invoke-JsonRetry -Method POST -Path "/auth/login" -Body @{
  email = $Email
  password = $Password
} -AllowedStatus @(403)

if ($null -ne $blockedLogin) {
  Fail "Archived account unexpectedly logged in again."
}
Write-Host "archived login blocked: ok"

Write-Host ""
Write-Host "Production auth smoke test passed." -ForegroundColor Green
Write-Host "Password and tokens were used in memory only and were not printed."

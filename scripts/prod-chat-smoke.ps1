param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$Email = $env:ZETTA_CHAT_SMOKE_EMAIL,
  [string]$Password = $env:ZETTA_CHAT_SMOKE_PASSWORD,
  [string]$FullName = $env:ZETTA_CHAT_SMOKE_FULL_NAME,
  [string]$Document = $env:ZETTA_CHAT_SMOKE_DOCUMENT,
  [string]$Message = $env:ZETTA_CHAT_SMOKE_MESSAGE,
  [string]$EmailDomain = "example.com",
  [string]$Language = "pt-BR"
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

function Assert-Bool {
  param([object]$Actual, [string]$Label)
  if ($null -eq $Actual -or $Actual -isnot [bool]) {
    Fail "$Label expected a boolean, got '$Actual'."
  }
}

function Assert-StringInSet {
  param([string]$Actual, [string[]]$Expected, [string]$Label)
  if ($Expected -notcontains $Actual) {
    Fail "$Label expected one of '$($Expected -join "', '")', got '$Actual'."
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
  if ($first -eq 10) {
    $first = 0
  }
  $digits.Add($first)

  $sum = 0
  for ($i = 0; $i -lt 10; $i++) {
    $sum += $digits[$i] * (11 - $i)
  }
  $second = ($sum * 10) % 11
  if ($second -eq 10) {
    $second = 0
  }
  $digits.Add($second)

  return ($digits -join "")
}

if (-not $ApiUrl) {
  $ApiUrl = "https://zetta-bergmann.onrender.com"
}
$ApiUrl = $ApiUrl.TrimEnd("/")

$runId = Get-Date -Format "yyyyMMddHHmmss"
if (-not $Email) {
  $Email = "qa-chat-$runId@$EmailDomain"
}
if (-not $Password) {
  $Password = "ZettaChat$runId!"
}
if (-not $FullName) {
  $FullName = "QA Chat Smoke"
}
if (-not $Document) {
  $Document = New-Cpf
}
if (-not $Message) {
  $Message = "Nao consigo abrir o app e preciso de ajuda."
}

Write-Host "ZETTA production chat smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Email: $Email"
Write-Host "Message: $Message"

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
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Write-Host "login: ok"

$consent = Invoke-JsonRetry -Method GET -Path "/privacy/consent" -Headers $headers
if (-not $consent.accepted) {
  $consentAccepted = Invoke-JsonRetry -Method POST -Path "/privacy/consent" -Headers $headers -Body @{
    policy_version = $consent.policy_version
  }
  Assert-Equal $consentAccepted.accepted $true "consent accepted"
  Write-Host "privacy consent: ok"
} else {
  Write-Host "privacy consent: already accepted"
}

$chat = Invoke-JsonRetry -Method POST -Path "/chat/message" -Headers $headers -Body @{
  message = $Message
  language = $Language
}

if ([string]::IsNullOrWhiteSpace([string]$chat.answer)) {
  Fail "Chat response answer was empty."
}
Assert-StringInSet -Actual ([string]$chat.risk_level) -Expected @("LOW", "ELEVATED", "CRISIS") -Label "risk level"
Assert-Bool -Actual $chat.fallback -Label "fallback"
Assert-Bool -Actual $chat.in_scope -Label "in_scope"
Assert-Equal $chat.in_scope $true "in_scope"
if ($chat.fallback) {
  Fail "Chat response used fallback text. Check GROQ_API_KEY and chat AI routing in Render."
}
if (-not $chat.session_id) {
  Fail "Chat response did not return a session_id."
}
Write-Host "chat message: ok"

$history = Invoke-JsonRetry -Method GET -Path "/chat/history" -Headers $headers
Assert-Equal $history.session_id $chat.session_id "history session id"
if ($history.messages.Count -lt 2) {
  Fail "Chat history did not persist both user and assistant messages."
}
$lastTwo = $history.messages | Select-Object -Last 2
Assert-Equal $lastTwo[0].sender "USER" "history user sender"
Assert-Equal $lastTwo[1].sender "BERGMANN" "history assistant sender"
Write-Host "chat history: ok"

$archive = Invoke-JsonRetry -Method POST -Path "/privacy/account/archive" -Headers $headers
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
Write-Host "Production chat smoke test passed." -ForegroundColor Green
Write-Host "Password and tokens were used in memory only and were not printed."

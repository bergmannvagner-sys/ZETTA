param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$Email = $env:ZETTA_COMMERCIAL_EMAIL,
  [string]$Password = $env:ZETTA_COMMERCIAL_PASSWORD,
  [string]$FullName = $env:ZETTA_COMMERCIAL_FULL_NAME,
  [string]$Role = $env:ZETTA_COMMERCIAL_ROLE,
  [string]$Document = $env:ZETTA_COMMERCIAL_DOCUMENT
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
    [hashtable]$Headers = @{}
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
  Invoke-RestMethod @params
}

if (-not $ApiUrl) {
  $ApiUrl = "https://zetta-bergmann.onrender.com"
}
$ApiUrl = $ApiUrl.TrimEnd("/")

if (-not $Email) {
  Fail "Set ZETTA_COMMERCIAL_EMAIL or pass -Email."
}
if (-not $Password) {
  Fail "Set ZETTA_COMMERCIAL_PASSWORD or pass -Password. Do not commit or share this value."
}
if (-not $FullName) {
  Fail "Set ZETTA_COMMERCIAL_FULL_NAME or pass -FullName."
}
if (-not $Role) {
  $Role = "COMPANY"
}
$allowedRoles = @("PSYCHOLOGIST", "COMPANY", "NGO", "HOSPITAL", "CLINIC", "SPONSOR", "PUBLIC_INSTITUTION")
if (-not ($allowedRoles -contains $Role)) {
  Fail "Role '$Role' is not a commercial public role. Use one of: $($allowedRoles -join ', ')."
}
if (-not $Document) {
  Fail "Set ZETTA_COMMERCIAL_DOCUMENT or pass -Document. Use CPF for USER, CRP for PSYCHOLOGIST, and CNPJ for commercial organizations."
}

Write-Host "ZETTA production commercial account creation" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Email: $Email"
Write-Host "Role: $Role"

Invoke-Json -Method GET -Path "/health" | Out-Null
Write-Host "health: ok"

try {
  $registration = Invoke-Json -Method POST -Path "/auth/register" -Body @{
    email = $Email
    full_name = $FullName
    password = $Password
    role = $Role
    document = $Document
    lgpdConsent = $true
  }
} catch {
  $response = $_.Exception.Response
  if ($response -and $response.StatusCode.value__ -eq 409) {
    Fail "Account or document is already registered. Use the existing account in pending/admin screens or choose another email/document."
  }
  throw
}

if (-not $registration.user.id) {
  Fail "Registration did not return a user id."
}
if ($registration.user.role -ne $Role) {
  Fail "Registration returned role '$($registration.user.role)' instead of '$Role'."
}
if ($registration.user.status -ne "PENDING_VERIFICATION") {
  Fail "Commercial account should start as PENDING_VERIFICATION, got '$($registration.user.status)'."
}

Write-Host "created account: ok"
Write-Host "status: $($registration.user.status)"
Write-Host "subscription plan: $($registration.user.subscription_plan)"
Write-Host "subscription status: $($registration.user.subscription_status)"
Write-Host ""
Write-Host "Next: approve this account as SUPER_ADMIN, then use this email in prod-mercado-pago-checkout-smoke.ps1."
Write-Host "Password, token, and full document value were not printed."

param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$Search = $env:ZETTA_BILLING_SEARCH,
  [switch]$OnlyActive
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

if (-not $AdminEmail) {
  Fail "Set ZETTA_ADMIN_EMAIL or pass -AdminEmail."
}
if (-not $AdminPassword) {
  Fail "Set ZETTA_ADMIN_PASSWORD or pass -AdminPassword. Do not commit or share this value."
}

Write-Host "ZETTA production billing target finder" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $AdminEmail"

Invoke-Json -Method GET -Path "/health" | Out-Null
Write-Host "health: ok"

$adminLogin = Invoke-Json -Method POST -Path "/auth/login" -Body @{
  email = $AdminEmail
  password = $AdminPassword
}
if ($adminLogin.user.role -ne "SUPER_ADMIN") {
  Fail "Admin login succeeded, but role is '$($adminLogin.user.role)' instead of SUPER_ADMIN."
}
$headers = @{ Authorization = "Bearer $($adminLogin.access_token)" }
Write-Host "admin auth: ok"

$path = "/admin/subscriptions"
if ($Search) {
  $encodedSearch = [System.Uri]::EscapeDataString($Search)
  $path = "$path?q=$encodedSearch"
}

$accounts = Invoke-Json -Method GET -Path $path -Headers $headers
if ($OnlyActive) {
  $accounts = $accounts | Where-Object { $_.status -eq "ACTIVE" }
}

if (-not $accounts -or $accounts.Count -eq 0) {
  Write-Host "No commercial billing target found."
  Write-Host "Create and approve a PSYCHOLOGIST, COMPANY, CLINIC, HOSPITAL, NGO, SPONSOR, or PUBLIC_INSTITUTION account first."
  exit 0
}

Write-Host ""
Write-Host "Eligible commercial accounts:"
$accounts |
  Sort-Object role, email |
  Select-Object email, full_name, role, status, subscription_plan, subscription_status, billing_provider |
  Format-Table -AutoSize

Write-Host ""
Write-Host "Use one ACTIVE account email as ZETTA_BILLING_TARGET_EMAIL for prod-mercado-pago-checkout-smoke.ps1."
Write-Host "Admin password and token were not printed."

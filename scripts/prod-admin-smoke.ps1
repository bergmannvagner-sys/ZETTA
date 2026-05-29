param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$Email = $env:ZETTA_ADMIN_EMAIL,
  [string]$Password = $env:ZETTA_ADMIN_PASSWORD
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

  $uri = "$ApiUrl$Path"
  $params = @{
    Method = $Method
    Uri = $uri
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
  Fail "Set ZETTA_ADMIN_EMAIL or pass -Email. Do not paste the password into logs."
}
if (-not $Password) {
  Fail "Set ZETTA_ADMIN_PASSWORD or pass -Password. Do not commit or share this value."
}

Write-Host "ZETTA production admin smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $Email"

$health = Invoke-Json -Method GET -Path "/health"
Write-Host "health: ok"

$login = Invoke-Json -Method POST -Path "/auth/login" -Body @{
  email = $Email
  password = $Password
}
if (-not $login.access_token) {
  Fail "Login did not return an access token."
}
if ($login.user.role -ne "SUPER_ADMIN") {
  Fail "Login succeeded, but role is '$($login.user.role)' instead of SUPER_ADMIN."
}

$authHeaders = @{ Authorization = "Bearer $($login.access_token)" }
$me = Invoke-Json -Method GET -Path "/users/me" -Headers $authHeaders
if ($me.role -ne "SUPER_ADMIN") {
  Fail "/users/me returned role '$($me.role)' instead of SUPER_ADMIN."
}
Write-Host "auth: SUPER_ADMIN confirmed"

$checks = @(
  @{ name = "pending accounts"; path = "/admin/pending-accounts" },
  @{ name = "subscriptions"; path = "/admin/subscriptions" },
  @{ name = "commercial plans"; path = "/admin/commercial-plans" },
  @{ name = "billing config"; path = "/admin/billing-config" },
  @{ name = "audit logs"; path = "/admin/audit-logs?limit=5" }
)

foreach ($check in $checks) {
  Invoke-Json -Method GET -Path $check.path -Headers $authHeaders | Out-Null
  Write-Host "$($check.name): ok"
}

Write-Host ""
Write-Host "Production admin smoke test passed." -ForegroundColor Green
Write-Host "Token was used in memory only and was not printed."

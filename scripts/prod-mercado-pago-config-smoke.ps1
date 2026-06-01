param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD
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

Write-Host "ZETTA production Mercado Pago config smoke test" -ForegroundColor Green
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

$billingConfig = Invoke-Json -Method GET -Path "/admin/billing-config" -Headers $headers
$mercadoPago = $billingConfig.provider_capabilities | Where-Object { $_.provider -eq "MERCADO_PAGO" } | Select-Object -First 1
if (-not $mercadoPago) {
  Fail "MERCADO_PAGO provider capability was not returned."
}
if (-not $mercadoPago.provider_configured) {
  Fail "Mercado Pago is not configured. Set MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY, and MERCADO_PAGO_WEBHOOK_SECRET in Render."
}
if (-not $mercadoPago.production_enabled) {
  Fail "Mercado Pago production readiness is not enabled. Configure Mercado Pago credentials and return URLs in Render."
}
if ($mercadoPago.checkout_enabled) {
  Fail "Public checkout is unexpectedly enabled. This step must stay admin-only."
}
if (-not ($mercadoPago.required_env_names -contains "MERCADO_PAGO_ACCESS_TOKEN")) {
  Fail "Mercado Pago required env list is incomplete."
}

Write-Host "mercado pago configured: ok"
Write-Host "production readiness: ok"
Write-Host "public checkout disabled: ok"
Write-Host ""
Write-Host "Mercado Pago config smoke test passed." -ForegroundColor Green
Write-Host "No access token, public key, webhook secret, or admin password was printed."

param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$ResetEmail = $env:ZETTA_PASSWORD_RESET_EMAIL
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
if (-not $ResetEmail) {
  $ResetEmail = $AdminEmail
}

Write-Host "ZETTA production password reset smoke test" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Reset email: $ResetEmail"

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

$emailConfig = Invoke-Json -Method GET -Path "/admin/email-config" -Headers $headers
if (-not $emailConfig.smtp_configured) {
  $missing = @()
  if (-not $emailConfig.smtp_host_configured) { $missing += "SMTP_HOST" }
  if (-not $emailConfig.smtp_from_email_configured) { $missing += "SMTP_FROM_EMAIL" }
  if (-not $emailConfig.smtp_password_configured) { $missing += "SMTP_PASSWORD" }
  Fail "SMTP is not fully configured in production. Missing or incomplete: $($missing -join ', ')"
}
Write-Host "smtp config: ok"

$request = Invoke-Json -Method POST -Path "/auth/password-reset/request" -Body @{
  email = $ResetEmail
}
if ($request.reset_token) {
  Fail "Production password reset unexpectedly returned a reset token."
}
Write-Host "password reset request: ok"

Write-Host ""
Write-Host "Password reset smoke test passed." -ForegroundColor Green
Write-Host "Now confirm that the inbox received the Bergmann password reset email."
Write-Host "Token and admin password were not printed."

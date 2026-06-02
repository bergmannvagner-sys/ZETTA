param(
  [string]$ApiUrl = $env:EXPO_PUBLIC_API_URL,
  [string]$AdminEmail = $env:ZETTA_ADMIN_EMAIL,
  [string]$AdminPassword = $env:ZETTA_ADMIN_PASSWORD,
  [string]$CommercialEmail = $env:ZETTA_COMMERCIAL_EMAIL,
  [string]$CommercialPassword = $env:ZETTA_COMMERCIAL_PASSWORD,
  [string]$CommercialFullName = $env:ZETTA_COMMERCIAL_FULL_NAME,
  [string]$CommercialRole = $env:ZETTA_COMMERCIAL_ROLE,
  [string]$CommercialDocument = $env:ZETTA_COMMERCIAL_DOCUMENT,
  [switch]$CreateCheckout
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail {
  param([string]$Message)
  Write-Error $Message
  exit 1
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
if (-not $CommercialEmail) {
  Fail "Set ZETTA_COMMERCIAL_EMAIL or pass -CommercialEmail."
}
if (-not $CommercialPassword) {
  Fail "Set ZETTA_COMMERCIAL_PASSWORD or pass -CommercialPassword. Do not commit or share this value."
}
if (-not $CommercialFullName) {
  Fail "Set ZETTA_COMMERCIAL_FULL_NAME or pass -CommercialFullName."
}
if (-not $CommercialRole) {
  $CommercialRole = "COMPANY"
}
if (-not $CommercialDocument) {
  Fail "Set ZETTA_COMMERCIAL_DOCUMENT or pass -CommercialDocument."
}

Write-Host "ZETTA production commercial billing flow" -ForegroundColor Green
Write-Host "API: $ApiUrl"
Write-Host "Admin email: $AdminEmail"
Write-Host "Commercial email: $CommercialEmail"
Write-Host "Commercial role: $CommercialRole"
Write-Host ""

Write-Host "Step 1/4: create commercial account"
& "$scriptDir\prod-create-commercial-account.ps1" `
  -ApiUrl $ApiUrl `
  -Email $CommercialEmail `
  -Password $CommercialPassword `
  -FullName $CommercialFullName `
  -Role $CommercialRole `
  -Document $CommercialDocument

Write-Host ""
Write-Host "Step 2/4: approve commercial account"
& "$scriptDir\prod-approve-commercial-account.ps1" `
  -ApiUrl $ApiUrl `
  -AdminEmail $AdminEmail `
  -AdminPassword $AdminPassword `
  -TargetEmail $CommercialEmail `
  -Reason "production commercial billing flow"

Write-Host ""
Write-Host "Step 3/4: list active billing targets"
& "$scriptDir\prod-billing-targets.ps1" `
  -ApiUrl $ApiUrl `
  -AdminEmail $AdminEmail `
  -AdminPassword $AdminPassword `
  -Search $CommercialEmail `
  -OnlyActive

if ($CreateCheckout) {
  Write-Host ""
  Write-Host "Step 4/4: create Mercado Pago checkout preference"
  & "$scriptDir\prod-mercado-pago-checkout-smoke.ps1" `
    -ApiUrl $ApiUrl `
    -AdminEmail $AdminEmail `
    -AdminPassword $AdminPassword `
    -TargetEmail $CommercialEmail
} else {
  Write-Host ""
  Write-Host "Step 4/4: checkout preference skipped"
  Write-Host "Run this script again with -CreateCheckout after Mercado Pago env vars are configured in Render."
}

Write-Host ""
Write-Host "Production commercial billing flow completed." -ForegroundColor Green
Write-Host "Passwords, token, full document value, and full checkout URL were not printed by this script."

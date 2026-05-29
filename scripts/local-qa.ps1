param(
  [switch]$SkipInstall,
  [switch]$StrictAudit
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [scriptblock]$Command
  )

  Write-Step $Name
  Push-Location $WorkingDirectory
  try {
    & $Command
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Invoke-Audit {
  Write-Step "Frontend npm audit"
  Push-Location $frontendDir
  try {
    npm audit --audit-level=moderate
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      if ($StrictAudit) {
        throw "npm audit found vulnerabilities and StrictAudit is enabled"
      }

      Write-Host ""
      Write-Host "npm audit reported vulnerabilities. Review before using npm audit fix --force." -ForegroundColor Yellow
      Write-Host "This step is informational unless -StrictAudit is passed." -ForegroundColor Yellow
    }
  }
  finally {
    Pop-Location
  }
}

function Invoke-SecretScan {
  Write-Step "Repository secret and generated-file scan"
  Push-Location $repoRoot
  try {
    $trackedGenerated = git ls-files | rg "(^|/)(node_modules|\.venv|venv|dist|build|\.next)|\.(apk|aab)$"
    if ($LASTEXITCODE -eq 0 -and $trackedGenerated) {
      Write-Host $trackedGenerated
      throw "Generated artifacts are tracked"
    }

    $secretMatches = rg "sk-[A-Za-z0-9]|GROQ_API_KEY\s*=\s*\S+|JWT_SECRET_KEY\s*=\s*\S+|BILLING_WEBHOOK_SECRET\s*=\s*\S+|postgresql://[^\s]+:[^\s]+@|postgresql\+asyncpg://[^\s]+:[^\s]+@" `
      --glob "!frontend/package-lock.json" `
      --glob "!backend/.env.example" `
      --glob "!frontend/.env.example" `
      --glob "!docs/MVP_LOCAL_REVIEW_CHECKLIST.md" `
      --glob "!scripts/local-qa.ps1"

    if ($LASTEXITCODE -eq 0 -and $secretMatches) {
      Write-Host $secretMatches
      throw "Potential secret found in tracked files"
    }

    Write-Host "No tracked generated artifacts or obvious secrets found."
  }
  finally {
    Pop-Location
  }
}

Write-Host "ZETTA Bergmann local QA" -ForegroundColor Green
Write-Host "Repo: $repoRoot"

if (-not $SkipInstall) {
  Invoke-Checked "Frontend npm install" $frontendDir { npm install }
}

Invoke-Checked "Backend compileall" $backendDir { python -m compileall app }
Invoke-Checked "Backend pytest" $backendDir { python -m pytest }
Invoke-Checked "Frontend typecheck" $frontendDir { npm run typecheck }
Invoke-Checked "Frontend API URL check" $frontendDir { npm run check:api-url }
Invoke-Checked "Expo public config" $frontendDir { npx expo config --type public }
Invoke-SecretScan
Invoke-Audit

Write-Host ""
Write-Host "Local QA finished." -ForegroundColor Green
Write-Host "Android emulator UI QA still requires an online ADB device: adb devices should show emulator-* device."

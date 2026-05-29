# Local QA

Use this checklist when the physical Android phone is not available or when the emulator is unstable.

## Run the automated local suite

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local-qa.ps1
```

For faster repeated runs after dependencies are installed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local-qa.ps1 -SkipInstall
```

The script checks:

- backend Python compilation
- backend pytest suite
- frontend TypeScript typecheck
- frontend API URL resolution
- Expo public config
- tracked generated artifacts
- obvious hardcoded secrets
- npm audit report

`npm audit` is informational by default because some fixes may require a major Expo upgrade. To make vulnerabilities fail the run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local-qa.ps1 -StrictAudit
```

## Android emulator QA

The emulator is ready for app testing only when:

```powershell
adb devices
```

shows:

```text
emulator-5554 device
```

If it shows `offline`, do not run Expo UI QA yet. Open Android Studio > Device Manager and try:

- Wipe Data
- Cold Boot Now
- a stable Google APIs image, such as Android 34 x86_64

After the emulator is online:

```powershell
cd .\frontend
npx expo start -c --android
```

Then validate manually or through ADB:

- register USER
- register PSYCHOLOGIST
- register COMPANY
- login
- consent
- home with orb
- journal
- mood
- sharing
- emotional report
- chat
- SOS

## Production admin smoke test

After running the safe production seed:

```bash
python -m app.seed_super_admin
```

If the admin password was exposed or needs rotation, set a new `SUPER_ADMIN_PASSWORD` in Render and run:

```bash
python -m app.rotate_super_admin_password
```

validate admin auth without printing the password or token:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-admin-smoke.ps1
```

The script checks:

- `/health`
- `/auth/login`
- `/users/me`
- `/admin/pending-accounts`
- `/admin/subscriptions`
- `/admin/commercial-plans`
- `/admin/billing-config`
- `/admin/audit-logs`

Do not commit or share `ZETTA_ADMIN_PASSWORD`.

#A Cinematic Gift Site

A static Next.js romantic memory site backed by Google Sheets and Google Drive through a public Google Apps Script Web App. The browser loads editable content from Sheets, uses a local demo payload when the API is not configured, and stores anonymous playback/favourite state locally and in the `UserState` sheet.

## Local development

Requirements: Node.js 22 or later.

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Without `NEXT_PUBLIC_APPS_SCRIPT_URL`, the included original demo artwork and sample payload are used. Quality checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The production build is a static export in `out/`; it does not need a Node server.

## Google Sheet setup

1. Create a Google Sheet and copy its ID from the URL.
2. Open **Extensions > Apps Script**.
3. Create matching `.gs` files and paste the contents from `apps-script/`. The included `appsscript.json` is optional; the default manifest works for this project.
4. If the Apps Script project was opened from this Sheet, leave `SHEET_ID` blank at the top of `Config.gs`. For a standalone project, paste the Sheet ID there. `DRIVE_FOLDER_ID` is optional.
5. Run `setupNetflixGift()` from the Apps Script editor and authorize it. The function records the bound Sheet ID and creates a private signing secret internally, so no manual Script Properties are required. It then creates or repairs all ten tabs without deleting existing rows and inserts sample content when its stable IDs are absent.
6. Reload the Sheet. Use the **Netflix Gift** menu to insert samples, validate media, clear cache, or rebuild the content version.
7. Replace `demo/romantic-hero.png` sample values with your Google Drive sharing URLs or file IDs. Set each file to **Anyone with the link > Viewer**, then run **Validate All Media**.
All names, copy, ordering, categories, navigation, hero content, media, and credits are Sheet-managed. `CategoryItems` is the many-to-many mapping between `Categories` and `Media`.

## Apps Script deployment

1. Select **Deploy > New deployment > Web app**.
2. Set **Execute as** to yourself and **Who has access** to **Anyone**.
3. Deploy and authorize, then copy the URL ending in `/exec`.
4. Put it in `.env.local` as `NEXT_PUBLIC_APPS_SCRIPT_URL` for local builds or in the GitHub repository variable with the same name.

The `/dev` URL always runs the latest saved code and only works for authorized editors; use it for owner testing. The `/exec` URL runs the selected deployment version and is the public production endpoint. Create a new deployment version after changing Apps Script code.

This site is intentionally public and anonymous. The signed session token limits casual write abuse but is not authentication. State belongs to a browser-generated visitor ID, not a verified person. Anyone who clears browser storage receives a new ID.

## GitHub Pages

1. Push the project to a GitHub repository on `main`.
2. Open **Settings > Pages** and choose **GitHub Actions** as the source.
3. Open **Settings > Secrets and variables > Actions > Variables** and add `NEXT_PUBLIC_APPS_SCRIPT_URL` with the production `/exec` URL.
4. For a project page such as `https://username.github.io/repository-name/`, add `NEXT_PUBLIC_BASE_PATH` with `/repository-name`. For a custom domain, set it to an empty string.
5. Push to `main` or run **Deploy static site to Pages** manually. The workflow installs with `npm ci`, runs lint, TypeScript, unit tests, and the static build, then uploads `out/` using official Pages actions.

No Sheet ID, Drive folder ID, `APP_SECRET`, or other private backend configuration is placed in `NEXT_PUBLIC_*` variables or bundled into the frontend.

## Content and media behavior

- Drive file URLs, `open?id=` URLs, `uc?id=` URLs, raw file IDs, and resource keys are normalized.
- Images use Drive thumbnails; videos attempt direct HTML5 playback and then fall back to the Drive preview iframe.
- Failed state writes stay optimistic locally. Reopening the page restores the local copy; the Apps Script rate limit and lock protect Sheet writes.
- A local demo image is included so the static site works before Drive is configured. Replace it in Sheets for the live site.
- Apps Script cannot provide strong access control for a public, no-login write API and Google Drive can still throttle large public video playback. For sustained traffic, use a proper authenticated media backend rather than Apps Script.

## Apps Script debugging

Structured debugging is enabled in the code block at the top of `apps-script/Config.gs`:

```javascript
DEBUG_ENABLED: true,
DEBUG_LEVEL: "DEBUG"
```

Use `DEBUG` while setting up, `INFO` for normal production diagnostics, `WARN` for warnings/errors only, or set `DEBUG_ENABLED` to `false` to disable logs. Logs are JSON and include `requestId`, `action`, `stage`, `elapsedMs`, message, and sanitized context. Session tokens, signing secrets, authorization values, and full visitor IDs are redacted.

To inspect a failure, open the Apps Script editor, select **Executions**, open the failed run, and expand **Logs**. Filter or search the log output using the `requestId` returned in the API response metadata. Key stages include `request.*`, `security.*`, `bootstrap.*`, `sheet.*`, `state.*`, `drive.*`, `validation.*`, `setup.*`, and `cache.*`.
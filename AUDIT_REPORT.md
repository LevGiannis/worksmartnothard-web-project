# Audit Report — WorkSmartNotHard (Web + Desktop)

Date: 2025-12-21
Branch: `desktop-offline-windows-zip`
Commit (HEAD): `381c37f`

## Executive Summary

- Το project είναι λειτουργικό ως **Web SPA (Vite/React)** και ως **Desktop app (Electron)** με offline αποθήκευση σε αρχείο JSON.
- Τα builds που ελέγχθηκαν τοπικά: `npm run build`, `npm run build:electron-main`, `npm run electron:dist` — επιτυχή.
- Οι κύριες “τριβές” σε διανομή:
  - macOS: Gatekeeper εμφανίζει “damaged/can’t be opened” για unsigned/not notarized builds.
  - Windows: γενικά OK, αλλά αν ο χρήστης τρέξει `.exe` χωρίς σωστή αποσυμπίεση/φάκελο, μπορεί να προκύψουν missing DLL issues.

## Project Overview

### Stack
- UI: React 18 + TypeScript
- Bundler: Vite 5
- Styling: Tailwind 3 + PostCSS + Autoprefixer
- Routing: `react-router-dom` (BrowserRouter για web, HashRouter για Electron)
- Desktop: Electron (main/preload TS build σε `dist-electron/`)
- Packaging: `electron-builder` (mac zip, win zip, linux AppImage)

### Repo Structure (high level)
- `src/`: React app
- `electron/`: Electron main + preload + typings
- `dist/`: build output (web + electron-builder artifacts)
- `.github/workflows/`: CI for GitHub Pages + Desktop builds

## Build & CI Validation

### Local builds
- `npm run build` ✅ (web)
- `npm run build:electron-main` ✅
- `npm run electron:dist` ✅ (mac zip, unsigned)

Notes:
- Το terminal ανέφερε “vite: command not found” όταν έλειπαν dependencies. Με `npm ci` αποκαταστάθηκε.
- `electron-builder` warnings που παραμένουν: default app icon και απουσία code signing (αναμενόμενο χωρίς Apple Developer ID).

### Dependency security (npm audit)

`npm audit --audit-level=moderate` ανέφερε 3 moderate ευπάθειες:

- `electron < 35.7.5`: ASAR Integrity Bypass (fix απαιτεί major upgrade)
- `esbuild <= 0.24.2`: dev server request/response exposure (fix απαιτεί major upgrade του Vite)

Πρακτική πρόταση:

- Μην τρέξεις άκριτα `npm audit fix --force` στο ίδιο branch.
- Αν θες να το κλείσουμε, κάν’ το σε ξεχωριστό branch με ελεγχόμενη αναβάθμιση (Electron + Vite), μετά `npm run build` και `npm run electron:dist`.

### GitHub Actions workflows
- `/.github/workflows/deploy-pages.yml`
  - Trigger: `push` στο `main` + `workflow_dispatch`
  - Deploy: GitHub Pages
- `/.github/workflows/build-desktop.yml`
  - Trigger: `workflow_dispatch` + `release.published`
  - Jobs: macOS + Windows
  - Artifacts: `dist/*.zip`

Operational note:
- Για να εμφανίζεται/τρέχει πάντα εύκολα από Actions UI, το workflow πρέπει πρακτικά να υπάρχει στο default branch.

## Desktop Offline Storage

- Electron storage υλοποιείται στο `electron/main.ts` ως KV-store σε JSON αρχείο:
  - Path: `app.getPath('userData')/worksmart-device-storage.json`
  - IPC: `ws-storage:getItem/setItem/removeItem/clear`
- Renderer storage abstraction στο `src/services/storage.ts`:
  - Αν υπάρχει `window.wsDeviceStorage`: χρήση IPC backend (async)
  - Αλλιώς: χρήση `localStorage`

Observations:
- Η αποθήκευση entries/goals/tasks/pendings είναι fully async.
- `getProgressSummary()` είναι sync και δουλεύει μόνο για web/localStorage (documented στο code). Στο Electron οι callers πρέπει να χρησιμοποιούν async loaders.

## Routing & Offline

- Web: `BrowserRouter` με `basename` από `import.meta.env.BASE_URL`.
- Electron: `HashRouter` για να μην εξαρτάται από path routing σε `file://`.
- Service worker:
  - `src/utils/notifications.ts` αποφεύγει SW registration σε Electron/file://.

## Security Review (pragmatic)

- Electron window:
  - `contextIsolation: true` ✅
  - `nodeIntegration: false` ✅
  - `preload` via `contextBridge` ✅
- IPC surface:
  - Limited σε storage operations (OK)
  - Δεν εκθέτει arbitrary filesystem APIs στον renderer (good)

Recommendation (optional hardening):
- Consider `sandbox: true` και explicit `contentSecurityPolicy` (CSP) αν το app επεκταθεί ή φορτώνει remote content.

## Packaging & Distribution

### macOS
- Παράγεται zip (`dist/WorkSmartNotHard-<version>-arm64-mac.zip`).
- Χωρίς Developer ID signing + notarization, οι χρήστες θα βλέπουν συχνά Gatekeeper prompts.

Workarounds (user-side):
- Right-click → Open
- Privacy & Security → Open Anyway
- `xattr -dr com.apple.quarantine <path-to-app>`

### Windows
- Παράγεται zip.
- Common pitfall: running the `.exe` from μέσα από το zip ή μετακίνηση μόνο του `.exe` χωρίς τα υπόλοιπα αρχεία.

## Findings & Recommendations

### High
- **macOS Gatekeeper**: χωρίς notarization θα εμφανίζονται μπλοκαρίσματα (“damaged”).
  - Recommendation: αν θες “επαγγελματική” διανομή, πρόσθεσε signing + notarization.

### Medium
- **Icon**: χρησιμοποιείται default Electron icon (δεν υπάρχει set app icon για mac/win).
- **Docs**: README χρειάζεται σαφείς οδηγίες για download artifacts, mac Gatekeeper, Windows extraction.

### Low
- **Typed deps**: υπάρχει `@types/react-router-dom` ενώ χρησιμοποιείται `react-router-dom@6` (στο v6 συνήθως δεν χρειάζεται). Αν δεν προκαλεί πρόβλημα, μπορεί να μείνει, αλλά είναι υποψήφιο για cleanup.
- **Vite CJS deprecation warning**: πληροφοριακό. Δεν σπάει build.

## Suggested Next Steps (pick & choose)

1) Docs-first (άμεσο): αναβάθμιση README με:
- Download artifacts (Actions/Release)
- Troubleshooting macOS Gatekeeper
- Windows extraction/missing DLL notes
- Πού αποθηκεύονται τα δεδομένα (web vs desktop)

2) Distribution quality:
- Προσθήκη `dmg` στο mac target (πιο user-friendly από zip)
- App icons (`.icns`, `.ico`)

3) “Production-grade” mac distribution:
- Developer ID signing + notarization στο CI (requires Apple Developer account)

## Appendix

### Commands
- Web dev: `npm run dev`
- Web build: `npm run build`
- Electron dev: `npm run electron:dev`
- Electron dist: `npm run electron:dist`

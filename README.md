# WorkSmartNotHard — Web + Offline Desktop

React/Vite SPA που τρέχει:

- ως **Web app** (π.χ. GitHub Pages) με αποθήκευση στο `localStorage`
- ως **Desktop app** (Electron) με **offline αποθήκευση σε αρχείο στη συσκευή**

## Γρήγορη Εικόνα

- Web mode: δεδομένα ανά browser/profile (χωρίς κοινό sync)
- Desktop mode: δεδομένα σε JSON αρχείο στο `userData`
- Routing: Web `BrowserRouter` / Desktop `HashRouter`

## Προαπαιτούμενα (για development)

- Node.js 18+ (προτείνεται 20)
- npm 9+

## Local Development (Web)

```bash
npm ci
npm run dev
```

## Build (Web)

```bash
npm run build
npm run preview
```

## Portable Offline (διπλό κλικ σε `index.html`)

Φτιάχνει ένα self‑contained folder που ανοίγει με **διπλό κλικ** (χωρίς server/Electron):

```bash
npm ci
npm run build:portable
```

Μετά άνοιξε με διπλό κλικ το `portable/index.html`.

### Portable troubleshooting (αν ανοίγει “κενό”)

Στο `file://` δεν υπάρχει log αρχείο στον δίσκο (ο browser δεν μπορεί να γράψει αρχεία).

- Αν δεις κενή σελίδα, θα εμφανιστεί ένα **Portable Debug** panel.
- Πάτα **Download log** και στείλε το `worksmart-portable-log.txt`.

Σημείωση: Αν θες DevTools, συνήθως είναι `Ctrl+Shift+I` (Windows) ή `Cmd+Option+I` (Mac). Σε laptops το `F12` μπορεί να είναι πλήκτρο ήχου (χρειάζεται `Fn+F12`).

### Portable “χωρίς terminal” download (zip)

GitHub → **Actions** → **Build Portable (Double-Click Index)** → κατέβασε artifact `WorkSmartNotHard-portable`.

## Desktop App (Electron) — Offline στη συσκευή

### Dev

```bash
npm ci
npm run electron:dev
```

### Build / Packaging

```bash
npm run electron:dist
```

Τα artifacts βγαίνουν στο `dist/`.

## Πού αποθηκεύονται τα δεδομένα;

- **Web**: `localStorage` (δες `src/services/storage.ts`)
- **Desktop (Electron)**: JSON αρχείο (δες `electron/main.ts`)
	- filename: `worksmart-device-storage.json`
	- location: `app.getPath('userData')`

Δεν υπάρχει κοινός συγχρονισμός μεταξύ συσκευών.

## “Χωρίς terminal” downloads (Windows / macOS)

Το repo έχει workflow `/.github/workflows/build-desktop.yml`.

### Από GitHub Actions

1) GitHub → **Actions** → **Build Desktop App**
2) Άνοιξε το τελευταίο run
3) Στο κάτω μέρος → **Artifacts**
4) Κατέβασε:
	 - `WorkSmartNotHard-windows` (Windows)
	 - `WorkSmartNotHard-macos` (macOS)

### Από GitHub Release

Αν υπάρχει Release, τα ίδια `.zip` θα εμφανίζονται στα Release assets.

## Troubleshooting

### macOS: “is damaged and can’t be opened”

Αυτό είναι Gatekeeper/quarantine θέμα (unsigned / not notarized builds).

1) Μετέφερε το app στο **Applications**
2) Finder → Right‑click στο app → **Open** (όχι διπλό κλικ)
3) Αν χρειαστεί: **System Settings → Privacy & Security** → scroll κάτω → **Open Anyway**

Fallback (1 εντολή):

```zsh
xattr -dr com.apple.quarantine "/path/to/WorkSmartNotHard.app"
```

Σημείωση: Για “χωρίς prompts” διανομή σε άλλα Mac, χρειάζεται Apple Developer ID signing + notarization.

### Windows: missing `ffmpeg.dll` / missing DLL

Συνήθως συμβαίνει όταν:

- τρέχεις το `.exe` μέσα από το zip, ή
- μετέφερες μόνο το `.exe` χωρίς τα υπόλοιπα αρχεία.

Λύση:
- Κάνε **Extract All** σε φάκελο και τρέξε το `.exe` από εκεί.

### Windows (Work PC / Citrix / VDI): “has stopped working” / crash

Σε περιβάλλοντα Citrix/VDI ή εκτέλεση από κοινόχρηστο/network φάκελο, συχνά κρασάρει ο Chromium GPU process ή μπλοκάρει η εκτέλεση.

- Βεβαιώσου ότι έκανες **Extract All** και τρέχεις από **τοπικό δίσκο** (π.χ. `Desktop`), όχι μέσα από zip / shared folder.
- Η εφαρμογή γράφει log αρχείο: `worksmartnothard.log` στο `userData`.
	- Windows: `C:\Users\<you>\AppData\Roaming\WorkSmartNotHard\worksmartnothard.log`
	- macOS: `~/Library/Application Support/WorkSmartNotHard/worksmartnothard.log`
- GPU acceleration: από προεπιλογή είναι **κλειστό** (πιο σταθερό σε Citrix). Για δοκιμή με GPU, βάλε env `WS_ENABLE_GPU=true` πριν το άνοιγμα.

### Dev: “vite: command not found”

Σημαίνει ότι δεν υπάρχουν εγκατεστημένα dependencies.

```bash
npm ci
```

## Workflows

- `/.github/workflows/deploy-pages.yml`: deploy στο GitHub Pages (branch `main`)
- `/.github/workflows/build-desktop.yml`: builds για macOS/Windows (manual run ή σε Release)

## Τεκμηρίωση ελέγχου (Audit)

Δες `AUDIT_REPORT.md` για πλήρη αναφορά (builds, αρχιτεκτονική, γνωστά θέματα διανομής, προτάσεις).

## Dependency audit (σημείωση)

`npm audit --audit-level=moderate` αναφέρει αυτή τη στιγμή moderate θέματα που κλείνουν με major upgrades (Electron/Vite). Αν θες να τα λύσουμε, κάν’ το σε ξεχωριστό branch και επιβεβαίωσε builds (`npm run build`, `npm run electron:dist`).

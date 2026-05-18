# WorkSmartNotHard

React/Vite SPA για παρακολούθηση εργασίας, στόχων και απόδοσης. Σχεδιασμένο για επαγγελματίες του κλάδου τηλεπικοινωνιών.

Τρέχει:
- ως **Web app** (π.χ. GitHub Pages) με αποθήκευση στο `localStorage`
- ως **Portable offline** build που ανοίγει με **διπλό κλικ** στο `portable/index.html` (χωρίς server)

---

## Λειτουργίες

- **Καταχώρηση εργασιών** — Εγγραφή ημερήσιων εργασιών με κατηγορία, στοιχεία πελάτη (όνομα, τηλέφωνο, ΑΦΜ), αρ. παραγγελίας και πόντους
- **Στόχοι μήνα** — Ορισμός μηνιαίων targets ανά κατηγορία με visual progress bars
- **Dashboard** — KPIs, πρόοδος μήνα, γρήγορες συνδέσεις
- **Στατιστικά & Export** — Φιλτράρισμα ανά ημέρα/μήνα/κατηγορία/πελάτη · εξαγωγή σε Excel με ελληνική μορφοποίηση
- **Εκκρεμότητες** — Παρακολούθηση follow-ups, επισκευών, παραγγελιών εξοπλισμού με badges επείγοντος
- **Tasks** — Απλή λίστα υπενθυμίσεων/εργασιών ομάδας
- **Προφίλ** — Αποθήκευση στοιχείων χρήστη, διαπιστευτηρίων καταστήματος, backup/restore
- **Dark mode** — Αυτόματη ανίχνευση system preference + manual toggle
- **Αυτόματο backup** — Trigger σε τακτά χρονικά διαστήματα με επιλογή φακέλου (File System Access API)

---

## Tech Stack

| Κατηγορία | Τεχνολογία |
|-----------|------------|
| Frontend | React 18, TypeScript 5.2 |
| Build | Vite 5 |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router DOM 6 |
| Export | xlsx 0.18 |
| Tests | Vitest 2 |
| Icons | @heroicons/react |

---

## Δομή project

```
src/
├── pages/          # Σελίδες app (Dashboard, AddEntry, Stats, Pendings, Tasks, Profile, Manager…)
├── components/     # Επαναχρησιμοποιούμενα UI components (Button, Card, Modal, MonthProgress…)
├── hooks/          # Custom hooks (useProgress, useEntryForm, useScheduledBackup)
├── services/       # storage.ts — data layer (localStorage → in-memory fallback)
├── utils/          # Βοηθητικές συναρτήσεις (exportExcel, validateEntry, formatNumber…)
└── types/          # TypeScript type definitions
```

---

## Προαπαιτούμενα (development)

- Node.js 18+ (προτείνεται 20)
- npm 9+

---

## Εκτέλεση & Build

### Τοπικό development

```bash
npm ci
npm run dev
# → http://localhost:5173
```

### Web build (GitHub Pages)

```bash
npm run build
npm run preview
```

### Portable Offline (διπλό κλικ)

Self-contained folder χωρίς server:

```bash
npm ci
npm run build:portable
# → portable/index.html
```

### Tests

```bash
npm test
```

---

## Δεδομένα & Αποθήκευση

Το app είναι **fully offline** — δεν υπάρχει backend.

| Κλειδί localStorage | Περιεχόμενο |
|--------------------|-------------|
| `ws_entries` | Ημερήσιες εγγραφές εργασίας |
| `ws_goals` | Μηνιαίοι στόχοι ανά κατηγορία |
| `ws_tasks` | Tasks λίστα |
| `ws_pendings` | Εκκρεμότητες |
| `ws_user_*` | Στοιχεία προφίλ |

Σε `file://` ή σε locked-down browsers, το app χρησιμοποιεί **in-memory fallback**. Για μόνιμη αποθήκευση: **Προφίλ → Μόνιμη αποθήκευση**.

### Export / Import

Από τη σελίδα **Προφίλ**:

- **Export**: `worksmart-backup-YYYY-MM-DDTHH-MM-SS.json`
- **Import**: φόρτωση backup + refresh

Μορφή backup:
```json
{
  "format": "worksmart-backup",
  "version": 1,
  "createdAt": "ISO timestamp",
  "data": { "ws_entries": "...", "ws_goals": "..." }
}
```

### Demo δεδομένα

Το [demo.json](demo.json) είναι έτοιμο importable backup με δείγματα εγγραφών.

---

## Deployment

### GitHub Pages

Αυτόματο deploy με κάθε push στο `main`:

```
.github/workflows/deploy-pages.yml
```

> Το base path (`PAGES_BASE`) είναι hardcoded στο `vite.config.ts`. Αν αλλάξει το όνομα του repo, ενημέρωσε αυτή την τιμή.

### Portable artifact (GitHub Actions)

```
.github/workflows/build-portable.yml
```

GitHub → **Actions** → **Build Portable** → artifact `WorkSmartNotHard-portable`

---

## Troubleshooting

### "vite: command not found"

```bash
npm ci
```

### Κενή σελίδα σε Portable

Εμφανίζεται **Portable Debug** panel. Πάτα **Download log** και δες το `worksmart-portable-log.txt`.

DevTools:
- Windows: `Ctrl+Shift+I` / `F12`
- macOS: `Cmd+Option+I`

---

## Audit

Δες [AUDIT_REPORT.md](AUDIT_REPORT.md) για τεχνικό έλεγχο (supported features, builds, γνωστά θέματα, προτάσεις).

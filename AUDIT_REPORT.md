# Audit Report — WorkSmartNotHard (Web + Portable)

Date: 2026-05-20
Branch: `main`

## Executive Summary

- Το project είναι λειτουργικό ως **Web SPA (Vite/React)** και ως **Portable offline** build (double‑click `portable/index.html`).
- Η σελίδα **Manager** έχει επεκταθεί σημαντικά με πλήρη ανάλυση αρχείων Excel (Mobile, Prepay, Vodafone Home), μηνιαία/ημερήσια views, targets, και export.
- Κύρια "τριβή" σε portable διανομή: σε ορισμένα περιβάλλοντα, το browser storage σε `file://` μπορεί να καθαρίζεται/μπλοκάρεται.

---

## Project Overview

### Stack
- UI: React 18 + TypeScript
- Bundler: Vite 5
- Styling: Tailwind 3 + PostCSS + Autoprefixer
- Routing: `react-router-dom` (BrowserRouter για web, HashRouter για `file://`)
- Excel I/O: `xlsx` (import αρχείων + export αποτελεσμάτων)

### Repo Structure (high level)
- `src/pages/ManagerPage.tsx` — κύρια σελίδα ανάλυσης (βλ. παρακάτω)
- `src/` — υπόλοιπο React app (Dashboard, AddEntry, Stats, Pendings, Tasks, Profile)
- `dist/` — build output (web)
- `portable/` — build output (portable)
- `.github/workflows/` — CI για GitHub Pages + Portable builds

---

## Build & CI Validation

### Local builds
- `npm run build` ✅ (web)
- `npm run build:portable` ✅ (portable)

Notes:
- Το terminal μπορεί να αναφέρει "vite: command not found" όταν λείπουν dependencies. Με `npm ci` αποκαθίσταται.

### GitHub Actions workflows
- `/.github/workflows/deploy-pages.yml` — Trigger: `push` στο `main` + `workflow_dispatch` → GitHub Pages
- `/.github/workflows/build-portable.yml` — Trigger: `push` στο `main` + `workflow_dispatch` → artifact `WorkSmartNotHard-portable.zip`

---

## Manager Page — Λειτουργικότητα

### Υποστηριζόμενα αρχεία Excel
| Τύπος | Ανίχνευση header | Σημειώσεις |
|-------|-----------------|------------|
| Mobile | `Ημ/νία Αίτησης` | Μετρεί συνδέσεις από `Αριθμός Συνδέσεων` |
| Prepay | `MSISDN` | |
| Vodafone Home | `Τηλέφωνο Υπηρεσίας` | |

### Κανόνες κατηγοριοποίησης

**Mobile — μετρούμενες υποκατηγορίες** (`MOBILE_COUNTED_SUBCATS`):
`EX PREPAY`, `PRE2EC`, `PORT IN POSTPAY`, `PORT IN EC`, `NEW CONNECTION`, `NEW EC`, `PREPAY 2 EC`

**Mobile PORT IN PREPAY**: εξαιρείται από mobile counts, αλλά αν ολοκληρωθεί μετρά ως **prepay**.

**Mobile FIXED ACTIVATION**: εξαιρείται από mobile counts, αλλά αν ολοκληρωθεί μετρά ως **Vodafone Home / One Net**.

**Vodafone Home — ταξινόμηση προϊόντος** (`classifyHomeProduct`): One Net (reclassified Fixed Activation) → Wireless (`Προγραμμά Χρήσης` περιέχει `Wireless`) → FTTH (`Ταχύτητα` περιέχει `FTTH`) → FTTC (fallback). Βλ. `MANAGER_LOGIC.md` για τη λογική των δύο μηνιαίων παραθύρων ("Συνδεδεμένα Μήνα" vs "Μετράνε στον Μήνα").

> Η κατηγορία **Migration FTTH** καταργήθηκε (δεν αναγνωρίζεται πλέον καθόλου — τα αρχεία της απλά αγνοούνται στο upload).

### Αποκλεισμοί (viewEntries)
Εξαιρούνται παντού εγγραφές με status:
- `ΑΚΥΡΩ` / `ΑΚΥΡΩΜΕΝ` (και από `Κατάσταση` column)
- `ΕΚΚΡΕΜ` (εκκρεμότητα)
- `ΑΠΟΡΡ` (απορρίφθηκε)
- `ΝΕΑ` (exact match)

> Εξαίρεση: `homeDocIssues` φιλτράρει απευθείας από `entries` (παρακάμπτει τον αποκλεισμό ΕΚΚΡΕΜ για να εμφανίσει `ΕΚΚΡΕΜΗ ΔΙΚΑΙΟΛΟΓΗΤΙΚΑ`).

### Ολοκληρωμένα / Συνδεδεμένα (`isDone`)
| Κατηγορία | Συνθήκες |
|-----------|---------|
| Όλες | status περιέχει `ΟΛΟΚΛΗΡΩΘΗΚΕ` ή `ΥΠΟ ΥΛΟΠΟΙΗΣΗ` |
| home | επιπλέον: status περιέχει `ΥΛΟΠΟΙΗΜΕΝΗ` |

Ημερομηνία αναφοράς ανά κατηγορία:
- **home**: `implDate` (Ημ/νία Ολοκλήρωσης / Κ5)
- **mobile**: `Ημερομηνία Έγκρισης`
- **prepay**: `implDate || date`

### Καταμέτρηση συνδέσεων (`countEntries`)
Για mobile, κάθε εγγραφή μπορεί να αντιστοιχεί σε > 1 σύνδεση (column `Αριθμός Συνδέσεων`). Η `countEntries()` αθροίζει `connections ?? 1` αντί για απλό `.length`. Εμφανίζεται badge `xN` δίπλα στην εγγραφή όταν N > 1.

### Views

**Ημερήσια**: εγγραφές ανά ημέρα → ανά χρήστη, με navigation (← →, datepicker, "Τελευταία").

**Μηνιαία (all users)**:
- Καταχωρήσεις vs στόχο (ανά κατηγορία, με progress bar)
- Ολοκληρωμένα/Συνδεδεμένα vs στόχο (ανά κατηγορία, με progress bar)
- Panel εκκρεμοτήτων: Mobile Προέγκριση · Home Υπό Υλοποίηση (counts ανά χρήστη)
- Vodafone Home — δύο παράθυρα ανάλυσης: "Συνδεδεμένα Μήνα" (ανά τύπο FTTH/FTTC/Wireless/One Net, ανεξαρτήτως καταχώρησης) και "Μετράνε στον Μήνα" (επίσημο KPI — FTTH μόνο αν καταχωρήθηκε+συνδέθηκε ίδιο μήνα, ή σε ΥΠΟ ΥΛΟΠΟΙΗΣΗ)
- Panel **δικαιολογητικών Home**: λίστα αιτήσεων με `ΛΑΘΟΣ/ΕΛΛΙΠΗ ΔΙΚΑΙΟΛΟΓΗΤΙΚΑ` ή `ΕΚΚΡΕΜΗ ΔΙΚΑΙΟΛΟΓΗΤΙΚΑ` (πελάτης + παραγγελία + status)
- Πίνακας χρηστών (done / σύνολο ανά κατηγορία)
- Αναλυτική λίστα ανά χρήστη: done entries (έντονα) + reg-only entries (faded), με πελάτη, παραγγελία, subCategory
- **Export Excel** (κουμπί στον header μήνα): εξάγει παραγγελίες του επιλεγμένου μήνα/user ταξινομημένες ανά κατηγορία → χρήστη

**Μηνιαία (single user)**: ίδια λογική φιλτραρισμένη στον επιλεγμένο χρήστη, ανά κατηγορία.

**Χρήστες**: αντιστοίχιση raw identifier Excel → εμφανιζόμενο όνομα (αποθηκεύεται στο `localStorage`).

### Targets
Μηνιαίοι στόχοι (reg + done ανά κατηγορία) αποθηκεύονται στο `localStorage` key `ws_manager_targets` ανά μήνα.

---

## Storage

- Storage abstraction στο `src/services/storage.ts`:
  - Primary: `localStorage`
  - Fallback: in‑memory store όταν το `localStorage` δεν είναι διαθέσιμο
- Manager-specific keys: `ws_manager_user_map`, `ws_manager_targets`

---

## Routing & Offline

- Web: `BrowserRouter` με `basename` από `import.meta.env.BASE_URL`
- Portable (`file://`): `HashRouter`
- Service worker: αποφεύγει SW registration σε `file://`

---

## Findings & Status

### Resolved since last audit
- ✅ README ανανεώθηκε με πλήρες feature list, tech stack, project structure
- ✅ Manager page: πλήρης λογική Mobile/Prepay/Home με σωστά φίλτρα
- ✅ Αποκλεισμός ακυρωμένων/νέων/απορριφθέντων παντού
- ✅ Εμφάνιση πελάτη + παραγγελίας σε όλα τα views
- ✅ Export Excel μηνιαίων δεδομένων

### Low (ανοιχτά)
- **Typed deps**: `@types/react-router-dom` ενώ το `react-router-dom@6` τα include ήδη — υποψήφιο για cleanup, δεν σπάει build.
- **Vite CJS deprecation warning**: πληροφοριακό, δεν επηρεάζει λειτουργία.

---

## Commands

```bash
npm run dev              # local development
npm run build            # web build → dist/
npm run build:portable   # portable build → portable/
npm test                 # Vitest
```

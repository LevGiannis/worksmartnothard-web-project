# WorkSmart Web

## Επισκόπηση

- Single Page Application σε React + TypeScript (Vite) που αναπαράγει τις βασικές ροές της WorkSmartNotHard εφαρμογής.
- Ενιαίος οπτικός σχεδιασμός με κοινά headers, διαφάνεια (glass UI) και υποστήριξη dark theme.
- Τοπική αποθήκευση δεδομένων (χωρίς backend), ιδανικό για γρήγορη καταγραφή στόχων, καταχωρήσεων και εκκρεμοτήτων.

## Βασικά Χαρακτηριστικά

- Κοινό `PageHeader` για ομοιογενείς τίτλους/breadcrumb σε όλες τις σελίδες.
- Hero section στην αρχική σελίδα με στατιστικά μήνα και γρήγορες ενέργειες.
- Εξειδικευμένη λογική φόρμας στην `AddEntryPage` (υποτύποι Vodafone Home, πολλαπλές επιλογές ποσών ραντεβού με αυτόματη άθροιση, προεπιλογή "Team Ready").
- Πλήρεις σελίδες για στόχους, στατιστικά, ιστορικό, εκκρεμότητες, προφίλ.
- Service worker scaffold (`public/sw.js`) για μελλοντικές ειδοποιήσεις.

## Τεχνολογίες & Προαπαιτούμενα

- Node.js 18 ή νεότερο, npm 9 ή νεότερο.
- Σύγχρονος browser με ενεργοποιημένο `localStorage`.
- Προαιρετικά: Tailwind/PostCSS toolchain εάν θέλεις να επεκτείνεις τα utilities.

## Γρήγορη Εκκίνηση

```bash
git clone <repository>
cd worksmart-web
npm install
npm run dev
```

Άνοιξε τον dev server (προεπιλογή: http://localhost:5173) για να χρησιμοποιήσεις την εφαρμογή.

## Διαθέσιμες Εντολές npm

- `npm run dev` — Εκκίνηση σε development mode με hot reload.
- `npm run build` — Δημιουργία παραγωγικού bundle (Vite).
- `npm run preview` — Τοπική προεπισκόπηση του production build.

## Deploy (Remote) χωρίς κοινή αποθήκευση

Μπορείς να το ανεβάσεις ως static site (GitHub Pages). Η εφαρμογή θα τρέχει απομακρυσμένα από URL, αλλά τα δεδομένα θα παραμένουν **τοπικά** στο `localStorage` του browser (άρα κάθε υπολογιστής/προφίλ browser έχει δικά του στοιχεία).

### GitHub Pages (με GitHub Actions)

- Υπάρχει workflow στο `/.github/workflows/deploy-pages.yml` που κάνει build και deploy.
- Το site θα σερβίρεται στο `https://<username>.github.io/WORKSMARTNOTHARD-WEB-PROJECT/`.

Βήματα:

1. Στο GitHub repo: **Settings → Pages**
2. Στο **Build and deployment** επίλεξε **Source: GitHub Actions**
3. Κάνε push στο `main` και περίμενε να ολοκληρωθεί το workflow.

### Πού αποθηκεύονται τα στοιχεία;

- Στον browser, στο `localStorage` (δες `src/services/storage.ts`).
- Δεν υπάρχει κοινή αποθήκευση/συγχρονισμός μεταξύ συσκευών.

## Δομή Έργου

- `src/main.tsx` — Εκκίνηση εφαρμογής, `router` και providers.
- `src/App.tsx` — Ορισμός route layout.
- `src/pages/` — Σελίδες (Αρχική, Στατιστικά, Καταχώρηση, Στόχοι, Εκκρεμότητες, Προφίλ κ.λπ.).
- `src/components/` — Επαναχρησιμοποιήσιμα στοιχεία UI (PageHeader, πίνακες, modals).
- `src/hooks/useProgress.ts` — Υπολογισμός προόδου/στόχων για τον τρέχοντα μήνα.
- `src/services/storage.ts` — Διαχείριση δεδομένων μέσω `localStorage` (entries, goals, tasks, pendings).
- `public/sw.js` — Σκελετός service worker για notifications.

## Δεδομένα & Αποθήκευση

- Όλα τα στοιχεία φυλάσσονται τοπικά στον browser (`localStorage`).
- Οι λίστες (entries, goals, tasks, pendings) είναι προσβάσιμες άμεσα χωρίς backend.
- Τα στατιστικά υπολογίζονται runtime βάσει των εγγραφών κάθε μήνα.

## Styling

- Κύριο stylesheet: `src/index.css` με custom κλάσεις εμπνευσμένες από Tailwind.
- Ενσωματωμένα fallbacks για να αποδίδεται σωστά το UI ακόμη και χωρίς build της Tailwind.
- Κοινό card/tile σύστημα (glassmorphism) και προσαρμοζόμενη διάταξη πλακιδίων στην αρχική.

## Σημειώσεις Ανάπτυξης

- Η αρχική σελίδα κάνει lazy επιλογή hero εικόνας ανάμεσα σε διαθέσιμα assets (public/hero\*.{jpg,svg}).
- Οι φόρμες έχουν βελτιωμένα validations και εμφανίζουν inline μηνύματα σφαλμάτων.
- Τα ραντεβού υποστηρίζουν πολλαπλές επιλογές ποσών με καταμέτρηση ανά ποσό και αυτόματο άθροισμα μονάδων.
- Το πεδίο αριθμού παραγγελίας για ραντεβού προεπιλέγει "Team Ready" αλλά μπορεί να τροποποιηθεί.

## Επόμενα Βήματα

- Ενσωμάτωση της πραγματικής φόρμουλας bonus από τον Android κώδικα.
- Προσθήκη αυτοματοποιημένων tests (unit και end-to-end) και pipeline CI/CD.
- Προαιρετικός συγχρονισμός σε backend για multi-device εμπειρία.
- Βελτίωση service worker ώστε να αποστέλλει προγραμματισμένες ειδοποιήσεις.

## Συνεισφορά

- Τα Pull Requests και τα issues είναι ευπρόσδεκτα.
- Χρησιμοποίησε την κύρια branch `main` ή δημιούργησε feature branches για τις αλλαγές.
- Προτείνεται `npm run build` πριν το commit για έλεγχο ότι όλα λειτουργούν.

Καλή χρήση του WorkSmart Web! 🎯

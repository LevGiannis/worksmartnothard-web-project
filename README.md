WorkSmart - Web prototype

This is a small React + TypeScript + Vite prototype porting the core flows of the WorkSmartNotHard Android app.

Quick start

1. cd into the project

```bash
cd /Users/ioannislevakos/Documents/application/worksmart-web
npm install
npm run dev
```

2. The app is an SPA with pages:

- / -> Overview (progress, goals, recent entries)
- /tasks -> Tasks list
- /history -> Entries history
- /add-entry -> Form to add an entry (points)
- /add-goal -> Add a goal

Storage is localStorage-based. The bonus calculation is a placeholder and should be adjusted to match the Android logic.

Next steps

- Replace bonus calculation with exact Android formula (I can port it once the Java file is available)
- Add styling (Tailwind or Material)
- Implement notifications (service worker + optional backend scheduling) if you want parity with reminder receivers
- Add tests and build/CI

Tailwind CSS

This prototype uses Tailwind CSS for styling. After `npm install`, the Tailwind/PostCSS plugins will be available and Vite will process the CSS directives. If you're missing dependencies, run:

```bash
npm install tailwindcss postcss autoprefixer --save-dev
npx tailwindcss init
```

Then run `npm run dev` as above.

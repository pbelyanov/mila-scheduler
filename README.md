# Mila-scheduler

A tiny web app for tracking a 4-month-old's daily feed + nap schedule. Built so grandparents can open it on an iPhone, enter the morning wake time, and follow a recalibrating schedule throughout the day. UI is in Bulgarian.

## What it does

- Enter the morning wake time → generates a full day schedule (feeds, naps, bedtime ritual)
- Mark each event as it happens (start / end / actual time)
- **Bedtime at 20:00 is the fixed anchor.** Everything else floats around it.
- **Connect naps**: when a nap merges with the next planned one, tap "Свързана дрямка" and the schedule rebalances with a 2h wake window after the merged nap.
- **Add a catnap**: if the final wake window before bedtime stretches too long, insert a short nap.
- Editable schedule template (in Settings): bedtime, wake windows, nap durations, feed interval.
- Persists today's state in `localStorage`. A new day auto-resets.

## Tech

- Vite + React 18 + TypeScript + Tailwind CSS
- PWA (installable to iPhone home screen, works offline after first load)
- Deploys to GitHub Pages via GitHub Actions

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/Mila-scheduler/`).

## Build

```bash
npm run build
npm run preview
```

## Deploying to GitHub Pages

1. Create a repository on GitHub named **Mila-scheduler** (the `base` path in `vite.config.ts` is `/Mila-scheduler/` — if you rename the repo, update it there).
2. Push this repo to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/Mila-scheduler.git
   git push -u origin main
   ```
3. In the repo settings on GitHub: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
4. Every push to `main` triggers `.github/workflows/deploy.yml`, which builds and deploys. The URL will be `https://<your-username>.github.io/Mila-scheduler/`.

## Installing on iPhone

1. Open the GitHub Pages URL in Safari.
2. Tap the Share button → "Add to Home Screen".
3. The app opens standalone, with its own icon.

The icon is a simple pink "М" SVG. Modern iOS Safari (15.4+) renders SVG apple-touch-icons. If you want a PNG icon, replace `public/apple-touch-icon.svg` with a 180×180 PNG (and update the `<link rel="apple-touch-icon">` in `index.html` plus the manifest in `vite.config.ts`).

## Project layout

```
src/
  App.tsx               top-level view switcher
  main.tsx              entry
  i18n.ts               Bulgarian UI strings
  schedule.ts           schedule generation + recalibration engine
  storage.ts            localStorage persistence
  timeutil.ts           time helpers (HH:MM <-> minutes)
  types.ts              shared types
  components/
    TodayView.tsx       main today timeline
    SettingsView.tsx    editable template
    EventCard.tsx       one event row
    WakeTimePrompt.tsx  morning wake-time input
    TimeInput.tsx       thin wrapper around <input type="time">
```

## The recalibration engine (`src/schedule.ts`)

- `generateEvents(wakeMin, template)` — builds the initial day from a morning wake time.
- `recalibrate(day, template)` — re-fits remaining events after any event completes. Anchors to the last done event's actual time, scales remaining wake windows so the day still lands at bedtime.
- `connectCurrentNap(day, template)` — merges the in-progress nap with the next planned one; the wake window after is set to the configured "connected" length (default 2h).
- `addCatnap(day, template)` — inserts a short nap between now and bedtime ritual when all planned naps are done but the remaining wake window is too long.

## Default template

- Bedtime: 20:00
- Ritual: 19:40
- Feeds: every 180 min (last gap absorbs variance, final feed at bedtime)
- Naps: `[90, 40, 40, 40]` min
- Wake windows: `[90, 105, 120, 120, 135]` min
- Connected wake window: 120 min
- Catnap duration: 20 min

All editable in-app via Settings.

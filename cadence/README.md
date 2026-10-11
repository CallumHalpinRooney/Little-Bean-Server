# Cadence

A lesson book for a music teacher: students, a calendar that fills itself from weekly slots,
and hours taught per student, month and term. It is an installable web app (PWA): no App Store,
no account, and it works offline.

## Install on a phone

1. Open the app's URL in **Safari** on iPhone (or Chrome on Android).
2. iPhone: tap **Share → Add to Home Screen**. Android: tap **Install app** on the Today screen.
3. Open it from the Home Screen. It runs full screen and works without signal.

## What it does

- **Today**: the next lesson with a one-tap WhatsApp reminder, today's and tomorrow's lessons,
  hours this week and term, students who haven't been seen for a while with nothing booked,
  and recent lessons still missing notes.
- **Calendar**: day, week and month views. Tap an empty slot to book; swipe to move between periods.
- **Students**: contact details, instrument, notes, regular weekly slots, term hour allocation and
  hourly rate. Each student's page shows hours this term, lesson history with notes, and what's next.
- **Hours**: hours taught by week, month, term or all time, per student, with fees at their rates.
  Export a CSV for timesheets or invoicing.

Lessons count as taught once their time has passed, unless marked cancelled or missed.
A weekly slot creates real lessons 16 weeks ahead and tops itself up each day.

## Data

Everything is stored on the phone (`localStorage`). There is no server. **Settings → Back up** saves
a JSON file (to Files, email, WhatsApp to yourself…) and **Restore from a backup** loads it on a new phone.

## Files

- `index.html` — the whole app (HTML, CSS, JS, no dependencies)
- `sw.js` — offline cache. Bump `VERSION` when `index.html` changes.
- `manifest.webmanifest`, `icons/` — Home Screen name and icon

## Deploy

`.github/workflows/pages-cadence.yml` publishes this folder to GitHub Pages on every push to `main`
that touches `cadence/`. The app lives at https://callumhalpinrooney.github.io/Little-Bean-Server/

One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

Any other static host with HTTPS works too (Netlify Drop, Cloudflare Pages): upload the folder as is.

Run locally: `npx serve cadence` and open http://localhost:3000.

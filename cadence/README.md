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
- **Campuses**: set up each campus and the weekdays spent there (a day belongs to one campus). Each
  student belongs to a campus; weekly slots only offer that campus's days, bookings on the other
  campus's day are flagged, and rescheduling suggests the student's next campus day and free gaps
  on campus days only. Calendar days are tinted by campus, students are grouped by campus, and Hours
  shows totals per campus. Students are placed automatically from their weekly lesson day.
- **Reschedule**: every lesson (and the Up next card) has a Reschedule button: same time next week,
  next day, or pick a time from the free gaps in the coming week. After a move it offers a ready-written
  WhatsApp message to the student, and the lesson shows "Moved from …" wherever it appears.
- **Calendar**: day, week and month views. Tap an empty slot to book; swipe to move between periods.
- **Students**: contact details, instrument, notes, regular weekly slots, term hour allocation and
  hourly rate. Each student's page shows hours this term, lesson history with notes, and what's next.
- **Hours**: hours taught by week, month, term or all time, per student, with fees at their rates.
  Export a CSV for timesheets or invoicing.

Built to need no training: a Getting started checklist and a one-minute guide (Settings → How Cadence
works), plain buttons (+ Lesson, + Student, Settings, Cancel this lesson), and times chosen from two
number lists instead of a clock face. Bookings, moves and weekly slots that would double-book him or
put him at two campuses on one day stop and ask before saving; such days are flagged on Today and in
the calendar.

Lessons count as taught once their time has passed, unless marked cancelled or missed.
A weekly slot creates real lessons 16 weeks ahead and tops itself up each day.

## Data

Everything is stored on the phone (`localStorage`). There is no server. **Settings → Back up** saves
a JSON file (to Files, email, WhatsApp to yourself…) and **Restore from a backup** loads it on a new phone.

## Usage counts

Cadence sends anonymous counts to GoatCounter (site code `callumhr1`, set in `GOAT` in
`index.html`) so you can see the app is being used: `app-opened` as a page view, plus events such as
`student-added`, `lesson-booked`, `lesson-moved`, `lesson-cancelled`, `notes-written`, `backup-made`.
Only the event name is sent: no names, phone numbers, notes or times, and no cookies.

Nothing is sent for sample data, in previews, over plain http, when the user turns off
**Settings → Share anonymous usage counts**, or on a phone that has opened the app with `#nocount`
on the end of the link (open it with `#count` to undo).

## Files

- `index.html` — the whole app (HTML, CSS, JS, no dependencies)
- `sw.js` — offline cache. Bump `VERSION` when `index.html` changes.
- `manifest.webmanifest`, `icons/` — Home Screen name and icon

## Deploy

This repo's GitHub Pages site is served from the `gh-pages` branch, which also holds the marketing
site. Cadence is published by copying this folder into `gh-pages` as `cadence/`, so it lives at
https://callumhalpinrooney.github.io/Little-Bean-Server/cadence/ without touching the rest.

Any other static host with HTTPS works too (Netlify Drop, Cloudflare Pages): upload the folder as is.

Run locally: `npx serve cadence` and open http://localhost:3000.

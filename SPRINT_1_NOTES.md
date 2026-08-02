# GigLog Sprint 1 — Archive 2.0

## Included

- Redesigned archive landing page and summary dashboard
- Ticket-style memory cards with festival, five-star and photo variants
- Photo preview on archive tickets
- Search across artist, venue, festival, city and country
- Filters for event type, minimum rating and ownership
- Sorting by newest, oldest or highest-rated
- Mobile archive layout and responsive ticket styling
- Production-safe Suspense boundary for `/gigs/new`

## Install

Keep your existing `.env.local` file. Replace the matching project files, then run:

```powershell
npm run build
npm run dev
```

After testing:

```powershell
git add .
git commit -m "Redesign GigLog ticket archive"
git push
```

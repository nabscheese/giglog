# Smart Log a Gig update

This update simplifies the **Log a Gig** flow and adds automatic event and setlist lookup.

## Environment variables

Add these to `.env.local` and to Vercel:

```env
TICKETMASTER_API_KEY=your_ticketmaster_consumer_key
SETLISTFM_API_KEY=your_setlistfm_api_key
```

## New flow

1. Search Ticketmaster by artist/event and optional city.
2. Select the exact event.
3. Artist, venue, date, city, country and ticket URL are filled automatically.
4. GigLog checks Setlist.fm using the selected artist, venue, city and date.
5. The user rates only Overall, Performance, Crowd and Venue.
6. The setlist can still be edited manually if no result is available or the listing is incomplete.

## Files changed

- `src/app/gigs/new/page.tsx`
- `src/app/api/ticketmaster/route.ts`
- `src/app/api/setlistfm/route.ts`
- `src/app/globals.css`

## Verification

Run locally:

```powershell
npm install
npm run build
npm run dev
```

The full build could not be run in the packaging environment because its internal npm mirror was missing `zod-validation-error@4.0.2`. Run `npm run build` on your computer before pushing.

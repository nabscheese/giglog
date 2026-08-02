SETLIST.FM-FIRST GIG SEARCH

Replace these files in your existing GigLog project:
- src/app/api/setlistfm/route.ts
- src/app/gigs/new/page.tsx
- src/app/globals.css

The new search checks Setlist.fm for historical gigs first and Ticketmaster for upcoming listings. Selecting a Setlist.fm result fills the artist, venue, city, date and setlist automatically.

Your .env.local must contain:
SETLISTFM_API_KEY=your_key
TICKETMASTER_API_KEY=your_key

Then restart and test:
npm run build
npm run dev

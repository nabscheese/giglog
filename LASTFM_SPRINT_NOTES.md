# Last.fm enrichment sprint

Add `LASTFM_API_KEY` to `.env.local` and Vercel.

This update adds:
- `/api/lastfm` server route
- artist/album artwork fallback for Setlist.fm search results
- genre tags on result cards
- popular tracks after selecting a gig
- 24-hour server caching for Last.fm calls

Last.fm images are not guaranteed for every artist. Ticketmaster artwork remains preferred for Ticketmaster results.

# Gig Log

A mobile-first social archive for live music memories. Built with Next.js, TypeScript, Supabase and Ticketmaster.

## Included

- Email/password accounts and persistent sessions
- Editable profiles, avatars, bios, home cities and favourite genres
- Public profile pages, people search and follow/unfollow
- Gig logging with six ratings, reviews, setlists, event type, city and ticket link
- Multiple photo uploads through Supabase Storage
- Archive search, filters and personal statistics
- Public activity feed with a following-only switch
- Likes and comments
- Artist aggregation and artist detail pages
- Venue and festival ratings
- Ticketmaster discovery with one-click form prefill
- Responsive gig-poster/ticket-stub interface

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in the values.
2. In Supabase SQL Editor, run `supabase/schema.sql` in full. It creates or upgrades the tables, RLS policies, views and storage buckets.
3. Install dependencies: `npm install`
4. Start locally: `npm run dev`
5. Open `http://localhost:3000`

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
TICKETMASTER_API_KEY=YOUR_TICKETMASTER_CONSUMER_KEY
```

Never put a Supabase secret/service-role key in a browser environment variable or commit it to Git.

## Deploy to Vercel

Push the folder to GitHub, import it in Vercel, add the three environment variables, then deploy. In Supabase Authentication URL Configuration, set the Site URL to the Vercel URL and add `http://localhost:3000/**` as a local redirect URL.

## Next production upgrades

The codebase is a launchable MVP. A larger public product would still benefit from moderation/reporting, notification delivery, image moderation, rate limits, automated tests, error monitoring, accessibility review, data export/delete flows, and richer event providers such as Setlist.fm or Spotify.

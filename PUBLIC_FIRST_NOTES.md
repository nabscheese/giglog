# Public-first GigLog update

## What changed

- `/` is now a public landing page and community feed.
- The signed-in ticket collection moved to `/memories`.
- Guests can browse the feed, public gig pages, profiles, artists, venues, festivals, people and Discover.
- Login and registration now open in a right-side drawer.
- Guest actions such as like, follow and comment open the login drawer instead of silently doing nothing.
- Private pages still use `AuthGuard`, but now show a friendly members-only prompt instead of redirecting to a full login page.
- Navigation changes automatically for guests and members.
- `/auth` remains as a lightweight fallback page that opens the same drawer.

## Test checklist

1. Open `/` in a private/incognito window and confirm public memories load.
2. Browse `/feed`, `/people`, a public profile and a public gig without signing in.
3. Press Like, Follow or Comment while signed out and confirm the auth drawer opens.
4. Create an account or log in and confirm you return to the intended page.
5. Confirm member navigation shows Dashboard, Memories, Badges, Passport and Profile.
6. Confirm `/memories`, `/dashboard`, `/profile`, `/stats`, `/achievements`, `/passport`, `/import` and `/gigs/new` remain protected.
7. Run `npm run build` before deployment.

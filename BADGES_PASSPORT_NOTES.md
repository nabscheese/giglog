# Badges + Concert Passport

This sprint adds two client-computed features with no database migration required.

## Routes
- `/achievements` — progress-based and hidden achievements
- `/passport` — chronological concert passport stamps

## Notes
Achievements are calculated from the signed-in user's existing `gigs` rows, including artist, venue, city, country, reviews, photos and festival attendance.

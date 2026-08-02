# Festival lineup + automatic import setlists

## Required Supabase migration
Run `supabase/migrations/20260802_festival_artists.sql` in Supabase SQL Editor before using this update.

## What changed
- Festival memories store a lineup in `gigs.festival_artists`.
- Users tick only the artists they actually saw.
- Concert Archives `Bands Seen` entries start selected; `Bands Not Seen` start unselected.
- Import now checks Setlist.fm automatically during the import action.
- Festival imports check Setlist.fm separately for each selected artist.
- Setlist matching retries with looser venue/city matching when archive names differ.

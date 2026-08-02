# GigLog Sprint 5 — Import Centre

## Included

- Concert Archives CSV import with preview and duplicate checks.
- Concerts are saved before Setlist.fm enrichment begins.
- Failed concert inserts are skipped instead of stopping the full import.
- Failed or timed-out setlist lookups do not block other concerts.
- Three setlist lookups run at a time with visible progress.
- Festival lineups let users select only the artists they saw.
- Duplicate festival artist names use stable React keys.
- Profile settings include a direct link to the Import Centre.
- Import Centre styling and progress feedback have been polished.

## Database requirement

Run the migration in `supabase/migrations/20260802_festival_artists.sql` if it has not already been applied.

## Validation

`npx tsc --noEmit` passes. A full Next.js build could not run in the generation environment because the Linux SWC package was unavailable from its internal package mirror. Run `npm run build` locally before deployment.

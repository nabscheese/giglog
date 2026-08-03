# Festival search inside Log a Gig

This update changes `/gigs/new` so users can switch between **Gig / artist** and **Festival** search.

Festival search combines:

- matching festivals already logged in GigLog;
- current Ticketmaster results;
- a small built-in UK festival catalogue so well-known names such as Glastonbury, Download, Slam Dunk, Reading, Leeds, TRNSMT, Latitude and Creamfields remain selectable even when Ticketmaster has no current listing.

Selecting a festival fills its festival name, venue, city and country where available. The date remains editable because catalogue entries may represent a recurring festival rather than one specific year.

The Ticketmaster route now accepts `mode=festival` and uses broader festival detection across the event name and all classification levels.

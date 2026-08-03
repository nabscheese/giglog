# Gig Journey city filter

## Added

- Automatic city filter chips generated from the user's gigs.
- Selecting a city filters the route graphic, stats, venue pins and journey stops.
- The Leaflet map starts wide and smoothly flies to the selected city.
- **All cities** and **Reset view** restore the full journey.
- The selected-city summary updates the visible gig and venue counts.
- Route distance now ignores gigs without coordinates instead of producing an invalid total.
- Responsive horizontal city controls for mobile.

## Test

1. Open a profile containing the Gig Journey.
2. Select a city chip.
3. Confirm the graphic and stats filter to that city.
4. Scroll to the venue map and confirm it animates to the selected city.
5. Select **All cities** or **Reset view** and confirm the full route returns.

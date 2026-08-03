# Gig Journey performance update

## Changes
- Dragging now updates the SVG transform directly through `requestAnimationFrame` instead of triggering a React render on every pointer movement.
- Zooming is batched and only commits React state after the wheel interaction settles.
- Expensive route glow filters and node transitions are disabled while dragging.
- Added a remembered **Venue names** toggle. Numbered stops remain visible and clickable when labels are hidden.
- The toggle preference is stored in `localStorage` as `giglog-show-venue-names`.

## Local verification
```powershell
npm install
npm run build
npm run dev
```

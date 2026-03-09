# Changelog

All notable changes to this project are documented here.

---

## [0.3.0] - 2026-03-08

### Added
- **Drag-to-rearrange pick list** — cards can be dragged between columns and reordered within columns
- **Pick list rows** — players can add multiple rows of columns to build a 2D deck-planning grid
- **7 default columns** — pick list starts with 7 empty columns instead of 1
- **Pick list size slider** — moved to the pick list section header so it's accessible even while waiting for opponent; max size increased from 140px to 240px

### Changed
- **Full-width layout** — app now expands to fill the browser window instead of being capped at 960px
- **Proportional card overlap** — stacked card peek amount now scales with card size so cards remain readable at larger sizes
- **Maybeboard filtering** — CubeCobra exports now automatically exclude cards listed under `# maybeboard`; applies to curated presets, URL import, and paste import

---

## [0.2.0] - 2026-03-08

### Added
- **Curated cube presets** — dropdown of six curated cubes for players who don't want to import their own list
- **CubeCobra URL import** — host can paste a CubeCobra URL or cube ID to fetch a cube list directly
- **Vercel proxy function** — `api/fetch-cube.js` proxies CubeCobra requests to avoid CORS issues
- **Card images** — full Scryfall card images during drafting; stacked thumbnails in pick list
- **Pack and pick list size sliders** — adjustable card sizes, persisted to localStorage
- **Dark MTG-themed UI** — gold accent color scheme, Georgia serif font
- **Running pick list** — visible pick history organized by pack during the draft

### Fixed
- **Double-faced card images** — DFC cards now correctly match on the front face name
- **Session hijacking** — duplicate JOIN messages are ignored so a second guest can't steal an active session

### Changed
- **Real-time sync** — switched from PeerJS (WebRTC) to Supabase Realtime broadcast channels for reliable cross-network play

---

## [0.1.0] - 2026-03-08

### Added
- Initial working draft app
- Host/guest role selection
- Custom session codes
- Full Minneapolis Draft rules: pick1_own → trade → pick2_opp → trade back → pick2_own
- Race condition handling with pending state pattern
- Decklist export (copy to clipboard or download .txt)

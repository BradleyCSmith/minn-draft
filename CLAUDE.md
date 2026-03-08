# Minneapolis Draft App

## Project Overview

A web app for two players to conduct a Minneapolis Draft using a custom Magic: The Gathering cube. Players can import a card pool, run a real-time draft session together online, and export their final decklists for use in third-party play platforms (Magic Online, Cockatrice, etc.).

## Core Features

1. **Card Pool Import** — Load a cube list from a CubeCobra export (text list or URL)
2. **Session Hosting** — One player hosts a session, the other joins via a shared link or code
3. **Real-Time Draft** — Both players conduct a Minneapolis Draft simultaneously
4. **Decklist Export** — Players export their drafted cards as a text decklist

## Minneapolis Draft Rules

### Setup
- The full cube is shuffled and dealt into **16 packs of 7 cards** (112 cards total, drawn without replacement).
- Each player is assigned **8 packs**. All 16 packs come from the same shared pool — no card appears in more than one pack.

### Draft Process (repeated for each of the 8 pack pairs)

Each round proceeds as follows:

| Step | Action | Pack A cards remaining | Pack B cards remaining |
|------|--------|----------------------|----------------------|
| Start | Both players open their pack | 7 | 7 |
| 1 | Each player picks **1 card** face-down from their own pack | 6 | 6 |
| 2 | Players **trade packs** | — | — |
| 3 | Each player picks **2 cards** face-down from the received pack | 4 | 4 |
| 4 | Players **trade back** (return to original pack) | — | — |
| 5 | Each player picks **2 more cards** from their own pack | 2 | 2 |
| 6 | The remaining **2 cards are discarded** face-down | 0 | 0 |

**Cards picked per pack:** 1 + 2 + 2 = **5 cards**
**Total cards drafted:** 8 packs × 5 picks = **40 cards per player**

### Deck Building
Players build a **40-card deck** using any subset of their 40 drafted cards plus any number of basic lands.

## Key Design Considerations

- Draft picks are made **face-down** — players cannot see each other's picks during the draft
- The trade mechanic means both players must be in sync before advancing each step
- Sessions are **ephemeral** — no persistent user accounts needed, just a shared session code
- Card names must be **valid MTG card names** for export compatibility
- The cube must contain **at least 112 cards** (16 packs × 7 cards). A typical cube has ~180 cards — unused cards are simply not dealt into packs.

## Tech Stack

- **Frontend**: React + Vite (static site, no server-side rendering needed)
- **Real-Time Sync**: Supabase Realtime (broadcast channels — messages route through Supabase servers, no NAT traversal issues)
- **Card Data**: Scryfall API for card images (Collection API, batched 75 cards at a time)
- **Hosting**: Vercel (free, no spin-down issues), deployed at `minn-draft.vercel.app`
- **No backend server required** — all session state lives in the two players' browsers

### How the Session Connection Works
1. The host player chooses a custom **session code** and enters their cube list
2. The host shares the code with the guest
3. The guest enters the code to subscribe to the same Supabase broadcast channel (`draft-${code}`)
4. The guest sends a JOIN event; the host responds with START (including the generated packs)
5. Draft state is synced via broadcast events (TRADE_PACK, TRADE_BACK, READY_NEXT)
6. First-come-first-served guard prevents a second guest from hijacking an active session

## Project Structure

```
minn_draft/
├── CLAUDE.md
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── lib/
    │   └── supabase.js          # Supabase client initialization
    ├── components/
    │   ├── CardPoolImport.jsx   # CubeCobra list import (host only)
    │   ├── SessionLobby.jsx     # Host/join session UI
    │   ├── DraftBoard.jsx       # Main draft interface
    │   └── DecklistExport.jsx   # Export drafted cards
    ├── hooks/
    │   └── usePeer.js           # Deprecated (PeerJS replaced by Supabase)
    └── utils/
        ├── packGenerator.js     # Shuffle cube and deal 16 packs
        ├── scryfallCache.js     # Batch image fetching with session cache, set code + DFC support
        └── decklistFormatter.js # Format picks for export (strips set codes)
```

## Implemented Features

- Role selection at app start (host vs. guest) — guests skip card pool import
- Host enters a custom session code; guest joins by entering the same code
- Full Minneapolis Draft flow: pick1_own → trade → pick2_opp → trade back → pick2_own
- Race condition handling: pending state pattern for all three message types
- Stale closure fix: `stateRef` + `active` flag pattern for stable Supabase event listener
- Full card images during drafting (Scryfall normal size), text fallback if fetch fails
- Stacked thumbnail pick list organized in columns by pack number
- Adjustable size sliders for pack cards and pick list thumbnails (persisted to localStorage)
- DFC (double-faced card) image fix: matches on `card.name.split(' // ')[0]`
- Set code support in card list: `Lightning Bolt [M11]` fetches that printing's art
- Dark MTG-themed UI (CSS custom properties, gold accent)
- Decklist export (copy to clipboard or download .txt), set codes stripped from export

## Next Steps

1. **[High] Drag-to-rearrange pick list** — let players drag their picked cards between columns (or reorder within a column) to plan their deck as the draft progresses; columns could represent deck archetypes or colors rather than just pack numbers
2. **[High] CubeCobra URL import** — allow the host to paste a CubeCobra URL instead of copy/pasting the card list text; fetch the list directly from CubeCobra's export endpoint
3. **[High] Curated cube list presets** — add a dropdown for hosts with a selection of well-known cubes (fetched from CubeCobra) so players can jump into a draft without importing their own list
4. **[Medium] DFC back-face viewing** — double-faced cards currently show only the front face; add a flip button or hover interaction so players can view the back face during drafting and in the pick list
5. **[Low] Custom domain** — replace `minn-draft.vercel.app` with a custom URL (e.g. `minneapolisdraft.com`); buy a domain from a registrar like Namecheap or Google Domains and connect it to Vercel for free

## Out of Scope (for now)

- More than 2 players
- Other draft formats
- User accounts or draft history
- Mobile-specific UI

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
- **Real-Time Sync**: PeerJS (WebRTC peer-to-peer — browsers connect directly, no backend server)
- **Card Data**: Scryfall API for card images and validation
- **Hosting**: Vercel or GitHub Pages (both free, no spin-down issues)
- **No backend server required** — all session state lives in the two players' browsers

### How the P2P Connection Works
1. The host player opens the app and gets a generated **session code** (their PeerJS peer ID)
2. The host shares the code with the second player
3. The second player enters the code to establish a direct browser-to-browser connection
4. Draft state is synced between the two clients over the WebRTC data channel

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
    ├── components/
    │   ├── CardPoolImport.jsx   # CubeCobra list import
    │   ├── SessionLobby.jsx     # Host/join session UI
    │   ├── DraftBoard.jsx       # Main draft interface
    │   └── DecklistExport.jsx   # Export drafted cards
    ├── hooks/
    │   └── usePeer.js           # PeerJS connection logic
    └── utils/
        ├── packGenerator.js     # Shuffle cube and deal 16 packs
        └── decklistFormatter.js # Format picks for export
```

## Next Steps (in rough priority order)

1. **Remove debug logging** — strip `console.log` calls from `DraftBoard.jsx` before deploying
2. **Styling** — the UI is currently unstyled HTML; add CSS to make it usable and pleasant
3. **Card images** — integrate the Scryfall API to show card art during drafting
4. **Deployment** — deploy to Vercel or GitHub Pages so players can use it without running a local server

## Out of Scope (for now)

- More than 2 players
- Other draft formats
- User accounts or draft history
- Mobile-specific UI

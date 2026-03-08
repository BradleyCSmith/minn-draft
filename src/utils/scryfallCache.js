// Module-level cache persists for the browser session
const cache = {} // { cardString: { normal, small } }

// Parse "Lightning Bolt [M11]" → { name: "Lightning Bolt", set: "m11" }
function parseCard(cardString) {
  const match = cardString.match(/^(.+?)\s*\[([^\]]+)\]$/)
  if (match) return { name: match[1].trim(), set: match[2].trim().toLowerCase() }
  return { name: cardString.trim(), set: null }
}

// Fetch image URLs for an array of card name strings.
// Returns a plain object: { cardString: { normal, small } }
export async function fetchCardImages(cardStrings) {
  const unique = [...new Set(cardStrings)]
  const toFetch = unique.filter(c => !(c in cache))

  if (toFetch.length === 0) return { ...cache }

  const BATCH_SIZE = 75

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)

    const identifiers = batch.map(c => {
      const { name, set } = parseCard(c)
      return set ? { name, set } : { name }
    })

    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
      })
      const data = await res.json()

      if (data.data) {
        data.data.forEach(card => {
          const uris = card.image_uris || card.card_faces?.[0]?.image_uris
          if (!uris) return

          // For DFCs and split cards, Scryfall returns "Front // Back".
          // Match against just the front face name.
          const scryfallFrontName = card.name.split(' // ')[0].trim().toLowerCase()

          const match = batch.find(c => {
            const { name } = parseCard(c)
            return name.toLowerCase() === scryfallFrontName
          })
          if (match) {
            cache[match] = { normal: uris.normal, small: uris.small }
          }
        })
      }
    } catch (e) {
      console.error('Scryfall fetch failed:', e)
    }

    // Respect Scryfall rate limits between batches
    if (i + BATCH_SIZE < toFetch.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return { ...cache }
}

// Strip set code for decklist export: "Lightning Bolt [M11]" → "Lightning Bolt"
export function stripSetCode(cardString) {
  return cardString.replace(/\s*\[[^\]]+\]$/, '').trim()
}

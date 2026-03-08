const PACK_COUNT = 16
const PACK_SIZE = 7
const CARDS_NEEDED = PACK_COUNT * PACK_SIZE // 112

// Shuffle an array in place using Fisher-Yates
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Takes the full card pool, randomly selects 112 cards,
// and deals them into 16 packs of 7.
export function generatePacks(cardPool) {
  const shuffled = shuffle(cardPool).slice(0, CARDS_NEEDED)
  const packs = []
  for (let i = 0; i < PACK_COUNT; i++) {
    packs.push(shuffled.slice(i * PACK_SIZE, (i + 1) * PACK_SIZE))
  }
  return packs
}

// Formats a list of card name strings into a standard decklist format
// compatible with Magic Online, Cockatrice, and most other platforms.
// Format: "1 Card Name" per line.
export function formatDecklist(cards) {
  return cards.map(card => `1 ${card}`).join('\n')
}

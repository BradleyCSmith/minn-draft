import { stripSetCode } from './scryfallCache.js'

export function formatDecklist(cards) {
  return cards.map(card => `1 ${stripSetCode(card)}`).join('\n')
}

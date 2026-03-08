import { formatDecklist } from '../utils/decklistFormatter.js'

export default function DecklistExport({ picks }) {
  const decklist = formatDecklist(picks)

  function handleCopy() {
    navigator.clipboard.writeText(decklist)
  }

  function handleDownload() {
    const blob = new Blob([decklist], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decklist.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h2>Draft Complete!</h2>
      <p>You drafted {picks.length} cards.</p>
      <pre>{decklist}</pre>
      <button onClick={handleCopy}>Copy to Clipboard</button>
      <button onClick={handleDownload}>Download as .txt</button>
    </div>
  )
}

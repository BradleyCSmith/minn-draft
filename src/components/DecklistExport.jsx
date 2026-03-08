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
    <div className="panel" style={{ maxWidth: 600, margin: '4rem auto' }}>
      <h2 className="section-title">Draft Complete!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        You drafted {picks.length} cards. Export your decklist below.
      </p>
      <pre className="decklist">{decklist}</pre>
      <div className="btn-group" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" onClick={handleCopy}>Copy to Clipboard</button>
        <button className="btn" onClick={handleDownload}>Download .txt</button>
      </div>
    </div>
  )
}

import { useState } from 'react'

const MIN_CARDS = 112

export default function CardPoolImport({ onImport }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const cards = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (cards.length < MIN_CARDS) {
      setError(`Cube must have at least ${MIN_CARDS} cards. You entered ${cards.length}.`)
      return
    }

    setError('')
    onImport(cards)
  }

  return (
    <div className="panel">
      <h1 className="title" style={{ marginBottom: '0.25rem' }}>Minneapolis Draft</h1>
      <hr className="divider" />
      <h2 className="section-title">Import Card Pool</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
        Paste your cube list below (one card name per line).
        You can export this from CubeCobra using the text export option.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <textarea
          className="textarea"
          rows={20}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Black Lotus\nAncestral Recall\n...'}
        />
        {error && <p className="error">{error}</p>}
        <div>
          <button className="btn" type="submit">Import Cube</button>
        </div>
      </form>
    </div>
  )
}

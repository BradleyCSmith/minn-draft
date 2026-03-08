import { useState } from 'react'

const MIN_CARDS = 112

// Accepts a plain-text card list (one card name per line).
// CubeCobra's text export format is compatible with this.
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
    <div>
      <h1>Minneapolis Draft</h1>
      <h2>Import Card Pool</h2>
      <p>
        Paste your cube list below (one card name per line).
        You can export this from CubeCobra using the text export option.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={20}
          cols={50}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Black Lotus&#10;Ancestral Recall&#10;..."
        />
        <br />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Import</button>
      </form>
    </div>
  )
}

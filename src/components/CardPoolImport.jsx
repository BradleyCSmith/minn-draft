import { useState } from 'react'
import curatedCubes from '../data/curatedCubes.json'

const MIN_CARDS = 112

function parseCubeText(text) {
  const lines = text.split('\n').map(line => line.trim())

  // Discard everything from # maybeboard onward
  const maybeIdx = lines.findIndex(l => l.replace(/\s+/g, '').toLowerCase() === '#maybeboard')
  const mainLines = maybeIdx >= 0 ? lines.slice(0, maybeIdx) : lines

  return mainLines
    .filter(line => line.length > 0 && !line.startsWith('#')) // drop section headers
    .map(line => line.replace(/^\d+\s+/, ''))                 // strip quantity prefixes
}

function extractCubeId(input) {
  const match = input.match(/cubecobra\.com\/cube\/[^/]+\/([^/?#\s]+)/)
  return match ? match[1] : input.trim()
}

export default function CardPoolImport({ onImport }) {
  const [mode, setMode] = useState('preset')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  async function fetchCube(id) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/fetch-cube?id=${encodeURIComponent(id)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Fetch failed (${res.status})`)
      }
      const text = await res.text()
      const cards = parseCubeText(text)
      if (cards.length < MIN_CARDS) {
        setError(`Cube must have at least ${MIN_CARDS} cards. Got ${cards.length}.`)
        return
      }
      onImport(cards)
    } catch (e) {
      setError(e.message || 'Failed to fetch cube from CubeCobra.')
    } finally {
      setLoading(false)
    }
  }

  function handlePreset() {
    if (!selectedPreset) { setError('Please select a cube.'); return }
    fetchCube(selectedPreset)
  }

  function handleUrl() {
    const id = extractCubeId(urlInput)
    if (!id) { setError('Please enter a CubeCobra URL or cube ID.'); return }
    fetchCube(id)
  }

  function handlePaste(e) {
    e.preventDefault()
    const cards = parseCubeText(pasteText)
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

      <div className="tab-group">
        <button className={`tab-btn ${mode === 'preset' ? 'tab-btn--active' : ''}`} onClick={() => switchMode('preset')}>Curated Cubes</button>
        <button className={`tab-btn ${mode === 'url'    ? 'tab-btn--active' : ''}`} onClick={() => switchMode('url')}>CubeCobra URL</button>
        <button className={`tab-btn ${mode === 'paste'  ? 'tab-btn--active' : ''}`} onClick={() => switchMode('paste')}>Paste List</button>
      </div>

      {mode === 'preset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Choose from a curated selection of popular cubes.
          </p>
          <select
            className="input"
            value={selectedPreset}
            onChange={e => setSelectedPreset(e.target.value)}
          >
            <option value="">Select a cube...</option>
            {curatedCubes.map(cube => (
              <option key={cube.id} value={cube.id}>{cube.name}</option>
            ))}
          </select>
          {error && <p className="error">{error}</p>}
          <div>
            <button className="btn" onClick={handlePreset} disabled={loading || !selectedPreset}>
              {loading ? 'Loading...' : 'Use this cube'}
            </button>
          </div>
        </div>
      )}

      {mode === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Paste a CubeCobra URL or cube ID (found in the URL on any CubeCobra cube page).
          </p>
          <input
            className="input"
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://cubecobra.com/cube/overview/my-cube"
          />
          {error && <p className="error">{error}</p>}
          <div>
            <button className="btn" onClick={handleUrl} disabled={loading || !urlInput.trim()}>
              {loading ? 'Fetching...' : 'Fetch Cube'}
            </button>
          </div>
        </div>
      )}

      {mode === 'paste' && (
        <form onSubmit={handlePaste} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Paste your cube list below (one card name per line).
            You can export this from CubeCobra using the text export option.
          </p>
          <textarea
            className="textarea"
            rows={20}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={'Black Lotus\nAncestral Recall\n...'}
          />
          {error && <p className="error">{error}</p>}
          <div>
            <button className="btn" type="submit">Import Cube</button>
          </div>
        </form>
      )}
    </div>
  )
}

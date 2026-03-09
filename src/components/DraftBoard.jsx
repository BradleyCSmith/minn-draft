import { useState, useEffect, useRef } from 'react'
import { fetchCardImages } from '../utils/scryfallCache.js'

const STEPS = ['pick1_own', 'pick2_opp', 'pick2_own']

export default function DraftBoard({ packs, channel, role, onComplete }) {
  const myPackIndices = role === 'host' ? [0,1,2,3,4,5,6,7] : [8,9,10,11,12,13,14,15]

  const [packIndex, setPackIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [myPack, setMyPack] = useState([...packs[myPackIndices[0]]])
  const [oppPack, setOppPack] = useState(null)
  const [picksByPack, setPicksByPack] = useState(Array.from({ length: 8 }, () => []))
  const [selected, setSelected] = useState([])
  const [waitingForOpp, setWaitingForOpp] = useState(false)

  const [pendingOppPack, setPendingOppPack] = useState(null)
  const [pendingMyPack, setPendingMyPack] = useState(null)
  const [pendingReadyNext, setPendingReadyNext] = useState(false)

  // Image URLs fetched from Scryfall
  const [imageUrls, setImageUrls] = useState({})
  const [imagesLoading, setImagesLoading] = useState(true)

  // Display size preferences (persisted to localStorage)
  const [packCardSize, setPackCardSize] = useState(
    () => Number(localStorage.getItem('packCardSize')) || 150
  )
  const [pickCardSize, setPickCardSize] = useState(
    () => Number(localStorage.getItem('pickCardSize')) || 72
  )

  // Pick list rows of columns — 2D grid for deck organization
  const [pickRows, setPickRows] = useState([[
    { id: 0, label: 'Column 1', cards: [] },
    { id: 1, label: 'Column 2', cards: [] },
    { id: 2, label: 'Column 3', cards: [] },
    { id: 3, label: 'Column 4', cards: [] },
    { id: 4, label: 'Column 5', cards: [] },
    { id: 5, label: 'Column 6', cards: [] },
    { id: 6, label: 'Column 7', cards: [] },
  ]])
  const nextColId = useRef(7)

  // Drag-to-rearrange state
  const [dragging, setDragging] = useState(null)   // { card, fromColId }
  const [dropTarget, setDropTarget] = useState(null) // { colId, insertBeforeCard: string|null }

  function updatePackCardSize(val) {
    setPackCardSize(val)
    localStorage.setItem('packCardSize', val)
  }

  function updatePickCardSize(val) {
    setPickCardSize(val)
    localStorage.setItem('pickCardSize', val)
  }

  const stateRef = useRef({})
  stateRef.current = { stepIndex, packIndex, waitingForOpp }

  const step = STEPS[stepIndex]
  const pickCount = step === 'pick1_own' ? 1 : 2
  const activePack = step === 'pick2_opp' ? oppPack : myPack
  const allPicks = picksByPack.flat()

  // Fetch images for all cards in all 16 packs upfront
  useEffect(() => {
    const allCards = [...new Set(packs.flat())]
    fetchCardImages(allCards).then(urls => {
      setImageUrls(urls)
      setImagesLoading(false)
    })
  }, [])

  function send(event, payload = {}) {
    channel.send({ type: 'broadcast', event, payload })
  }

  function doAdvanceToNextPack(currentPackIndex) {
    const next = currentPackIndex + 1
    setPackIndex(next)
    setMyPack([...packs[myPackIndices[next]]])
    setOppPack(null)
    setPendingOppPack(null)
    setPendingMyPack(null)
    setPendingReadyNext(false)
    setStepIndex(0)
    setSelected([])
    setWaitingForOpp(false)
  }

  useEffect(() => {
    let active = true

    channel.on('broadcast', { event: '*' }, ({ event, payload }) => {
      if (!active) return
      const { stepIndex: si, packIndex: pi, waitingForOpp: waiting } = stateRef.current

      if (event === 'TRADE_PACK') {
        if (si === 0 && !waiting) {
          setPendingOppPack(payload.pack)
        } else {
          setOppPack(payload.pack)
          setStepIndex(1)
          setWaitingForOpp(false)
        }
      }

      if (event === 'TRADE_BACK') {
        if (si === 1 && !waiting) {
          setPendingMyPack(payload.pack)
        } else {
          setMyPack(payload.pack)
          setStepIndex(2)
          setWaitingForOpp(false)
        }
      }

      if (event === 'READY_NEXT') {
        if (si === 2 && !waiting) {
          setPendingReadyNext(true)
        } else {
          doAdvanceToNextPack(pi)
        }
      }
    })

    return () => { active = false }
  }, [channel])

  function confirmPicks() {
    if (selected.length !== pickCount) return

    setPicksByPack(prev =>
      prev.map((packPicks, i) =>
        i === packIndex ? [...packPicks, ...selected] : packPicks
      )
    )
    setPickRows(prev =>
      prev.map((row, ri) =>
        ri === 0 ? row.map((col, ci) => ci === 0 ? { ...col, cards: [...col.cards, ...selected] } : col) : row
      )
    )
    setSelected([])

    if (step === 'pick1_own') {
      const remaining = myPack.filter(c => !selected.includes(c))
      setMyPack(remaining)
      send('TRADE_PACK', { pack: remaining })
      if (pendingOppPack) {
        setOppPack(pendingOppPack)
        setPendingOppPack(null)
        setStepIndex(1)
      } else {
        setWaitingForOpp(true)
      }

    } else if (step === 'pick2_opp') {
      const remaining = oppPack.filter(c => !selected.includes(c))
      send('TRADE_BACK', { pack: remaining })
      if (pendingMyPack) {
        setMyPack(pendingMyPack)
        setPendingMyPack(null)
        setStepIndex(2)
      } else {
        setWaitingForOpp(true)
      }

    } else if (step === 'pick2_own') {
      if (packIndex === 7) {
        onComplete(allPicks)
      } else {
        send('READY_NEXT')
        if (pendingReadyNext) {
          doAdvanceToNextPack(packIndex)
        } else {
          setWaitingForOpp(true)
        }
      }
    }
  }

  function toggleCard(card) {
    setSelected(prev =>
      prev.includes(card)
        ? prev.filter(c => c !== card)
        : prev.length < pickCount ? [...prev, card] : prev
    )
  }

  function CardImage({ card, className, onClick }) {
    const urls = imageUrls[card]
    if (urls?.normal) {
      return <img src={urls.normal} alt={card} title={card} className={className} onClick={onClick} />
    }
    return <div className="card-placeholder" title={card} onClick={onClick}>{card}</div>
  }

  function PickList() {
    if (allPicks.length === 0) return null

    const cardHeight = pickCardSize * (204 / 146)

    function addColumn(rowIdx) {
      const id = nextColId.current++
      setPickRows(prev => prev.map((row, ri) =>
        ri === rowIdx ? [...row, { id, label: `Column ${row.length + 1}`, cards: [] }] : row
      ))
    }

    function addRow() {
      const id = nextColId.current++
      setPickRows(prev => [...prev, [{ id, label: 'Column 1', cards: [] }]])
    }

    function deleteColumn(colId) {
      setPickRows(prev => {
        const orphans = prev.flatMap(row => row).find(c => c.id === colId)?.cards ?? []
        const newRows = prev
          .map(row => row.filter(c => c.id !== colId))
          .filter(row => row.length > 0)
        if (orphans.length > 0 && newRows.length > 0) {
          newRows[0] = newRows[0].map((col, i) => i === 0 ? { ...col, cards: [...col.cards, ...orphans] } : col)
        }
        return newRows.length > 0 ? newRows : [[{ id: nextColId.current++, label: 'Column 1', cards: orphans }]]
      })
    }

    function deleteRow(rowIdx) {
      setPickRows(prev => {
        const orphans = prev[rowIdx].flatMap(col => col.cards)
        const newRows = prev.filter((_, i) => i !== rowIdx)
        if (orphans.length > 0 && newRows.length > 0) {
          newRows[0] = newRows[0].map((col, i) => i === 0 ? { ...col, cards: [...col.cards, ...orphans] } : col)
        }
        return newRows
      })
    }

    function handleDragStart(e, card, fromColId) {
      setDragging({ card, fromColId })
      e.dataTransfer.effectAllowed = 'move'
    }

    function handleDragEnd() {
      setDragging(null)
      setDropTarget(null)
    }

    function handleDragOverCard(e, colId, card) {
      e.preventDefault()
      e.stopPropagation()
      setDropTarget({ colId, insertBeforeCard: card })
    }

    function handleDragOverColumn(e, colId) {
      e.preventDefault()
      if (dropTarget?.colId !== colId || dropTarget?.insertBeforeCard !== null) {
        setDropTarget({ colId, insertBeforeCard: null })
      }
    }

    function handleDrop(e, colId, insertBeforeCard) {
      e.preventDefault()
      e.stopPropagation()
      if (!dragging) return
      const { card, fromColId } = dragging
      setPickRows(prev => {
        let rows = prev.map(row => row.map(col =>
          col.id === fromColId ? { ...col, cards: col.cards.filter(c => c !== card) } : col
        ))
        rows = rows.map(row => row.map(col => {
          if (col.id !== colId) return col
          if (insertBeforeCard === null || !col.cards.includes(insertBeforeCard)) {
            return { ...col, cards: [...col.cards, card] }
          }
          const idx = col.cards.indexOf(insertBeforeCard)
          const next = [...col.cards]
          next.splice(idx, 0, card)
          return { ...col, cards: next }
        }))
        return rows
      })
      setDragging(null)
      setDropTarget(null)
    }

    function renderColumn(col, colIdx, isFirstRow) {
      const isColTarget = dropTarget?.colId === col.id && dropTarget?.insertBeforeCard === null
      const canDelete = !(isFirstRow && colIdx === 0)
      return (
        <div
          key={col.id}
          className={`pick-column ${isColTarget ? 'pick-column--drop-target' : ''}`}
          onDragOver={e => handleDragOverColumn(e, col.id)}
          onDrop={e => handleDrop(e, col.id, null)}
        >
          <div className="pick-column-header">
            <span className="pick-column-title">{col.label}</span>
            {canDelete && (
              <button className="pick-column-delete" onClick={() => deleteColumn(col.id)}>×</button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: pickCardSize, minHeight: cardHeight }}>
            {col.cards.map((card, i) => {
              const urls = imageUrls[card]
              const peek = Math.round(cardHeight * 0.18)
              const overlapMargin = i === 0 ? 0 : -(cardHeight - peek)
              const isDraggingThis = dragging?.card === card
              const isDropBefore = dropTarget?.colId === col.id && dropTarget?.insertBeforeCard === card
              const sharedStyle = {
                marginTop: overlapMargin,
                position: 'relative',
                cursor: 'grab',
                opacity: isDraggingThis ? 0.3 : 1,
                outline: isDropBefore ? '2px solid var(--accent)' : 'none',
                outlineOffset: 2,
              }
              return urls?.small
                ? <img key={card} src={urls.small} alt={card} title={card}
                    draggable
                    onDragStart={e => handleDragStart(e, card, col.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => handleDragOverCard(e, col.id, card)}
                    onDrop={e => handleDrop(e, col.id, card)}
                    style={{ width: pickCardSize, borderRadius: 4, display: 'block', ...sharedStyle }} />
                : <div key={card} className="pick-card-placeholder"
                    draggable
                    onDragStart={e => handleDragStart(e, card, col.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => handleDragOverCard(e, col.id, card)}
                    onDrop={e => handleDrop(e, col.id, card)}
                    style={{ width: pickCardSize, ...sharedStyle }}
                    title={card}>{card}</div>
            })}
          </div>
        </div>
      )
    }

    return (
      <div className="pick-list">
        <div className="pick-list-header">
          <div className="section-title" style={{ borderBottom: 'none', marginBottom: 0 }}>
            Your picks ({allPicks.length} cards)
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Size
            <input type="range" min={50} max={240} value={pickCardSize}
              onChange={e => updatePickCardSize(Number(e.target.value))} />
          </label>
        </div>

        <div className="pick-rows">
          {pickRows.map((row, rowIdx) => (
            <div key={rowIdx} className="pick-row">
              <div className="pick-columns">
                {row.map((col, colIdx) => renderColumn(col, colIdx, rowIdx === 0))}
                <button className="btn pick-add-column" onClick={() => addColumn(rowIdx)}>+ Column</button>
              </div>
              {rowIdx > 0 && (
                <button className="btn pick-delete-row" onClick={() => deleteRow(rowIdx)}>× Row</button>
              )}
            </div>
          ))}
          <button className="btn pick-add-row" onClick={addRow}>+ Row</button>
        </div>
      </div>
    )
  }

  const stepLabel = {
    pick1_own: 'Pick 1 card from your pack',
    pick2_opp: "Pick 2 cards from your opponent's pack",
    pick2_own: 'Pick 2 more cards from your pack',
  }[step]

  if (imagesLoading) {
    return (
      <div className="loading-screen">
        <p>Loading card images...</p>
      </div>
    )
  }

  if (waitingForOpp) {
    return (
      <div className="draft-layout">
        <div className="draft-header">
          <span className="pack-label">Pack {packIndex + 1} / 8</span>
        </div>
        <div className="panel waiting">Waiting for opponent...</div>
        {PickList()}
      </div>
    )
  }

  return (
    <div className="draft-layout">
      <div className="draft-header">
        <span className="pack-label">Pack {packIndex + 1} / 8</span>
        <span className="step-label">— {stepLabel} ({selected.length}/{pickCount})</span>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', opacity: 0.6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Pack cards
          <input type="range" min={100} max={240} value={packCardSize}
            onChange={e => updatePackCardSize(Number(e.target.value))} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${packCardSize}px)`, gap: '0.75rem' }}>
        {(activePack || []).map(card => {
          const isSelected = selected.includes(card)
          const isDisabled = !isSelected && selected.length >= pickCount
          return (
            <div
              key={card}
              className={`card-image-item ${isSelected ? 'card-image-item--selected' : ''} ${isDisabled ? 'card-image-item--disabled' : ''}`}
              onClick={() => !isDisabled && toggleCard(card)}
            >
              <CardImage card={card} />
            </div>
          )
        })}
      </div>

      <div>
        <button className="btn" onClick={confirmPicks} disabled={selected.length !== pickCount}>
          Confirm picks
        </button>
      </div>

      {PickList()}
    </div>
  )
}

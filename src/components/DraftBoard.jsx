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
    const packsWithPicks = picksByPack
      .map((packPicks, i) => ({ packNum: i + 1, cards: packPicks }))
      .filter(({ cards }) => cards.length > 0)

    if (packsWithPicks.length === 0) return null

    return (
      <div className="pick-list">
        <div className="section-title">Your picks ({allPicks.length} cards)</div>
        <div className="pick-columns">
          {packsWithPicks.map(({ packNum, cards }) => (
            <div key={packNum} className="pick-column">
              <div className="pick-column-title">Pack {packNum}</div>
              <div style={{ display: 'flex', flexDirection: 'column', width: pickCardSize }}>
                {cards.map((card, i) => {
                  const urls = imageUrls[card]
                  // Show ~18px of each card below the one on top
                  const cardHeight = pickCardSize * (204 / 146)
                  const overlapMargin = i === 0 ? 0 : -(cardHeight - 18)
                  return urls?.small
                    ? <img key={card} src={urls.small} alt={card} title={card}
                        style={{ width: pickCardSize, borderRadius: 4, display: 'block', marginTop: overlapMargin, position: 'relative' }} />
                    : <div key={card} className="pick-card-placeholder"
                        style={{ width: pickCardSize, marginTop: i === 0 ? 0 : overlapMargin }}
                        title={card}>{card}</div>
                })}
              </div>
            </div>
          ))}
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
        <PickList />
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Pick list
          <input type="range" min={50} max={140} value={pickCardSize}
            onChange={e => updatePickCardSize(Number(e.target.value))} />
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

      <PickList />
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

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

  const stateRef = useRef({})
  stateRef.current = { stepIndex, packIndex, waitingForOpp }

  const step = STEPS[stepIndex]
  const pickCount = step === 'pick1_own' ? 1 : 2
  const activePack = step === 'pick2_opp' ? oppPack : myPack
  const allPicks = picksByPack.flat()

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

  const stepLabel = {
    pick1_own: 'Pick 1 card from your pack',
    pick2_opp: "Pick 2 cards from your opponent's pack",
    pick2_own: 'Pick 2 more cards from your pack',
  }[step]

  function PickList() {
    const packsWithPicks = picksByPack
      .map((packPicks, i) => ({ packNum: i + 1, cards: packPicks }))
      .filter(({ cards }) => cards.length > 0)

    if (packsWithPicks.length === 0) return null

    return (
      <div className="pick-list">
        <div className="section-title">Your picks ({allPicks.length} cards)</div>
        <div className="pick-list-columns">
          {packsWithPicks.map(({ packNum, cards }) => (
            <div key={packNum} className="pick-pack">
              <div className="pick-pack-title">Pack {packNum}</div>
              <ul>
                {cards.map(card => <li key={card}>{card}</li>)}
              </ul>
            </div>
          ))}
        </div>
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

      <div>
        <ul className="card-list">
          {(activePack || []).map(card => {
            const isSelected = selected.includes(card)
            const isDisabled = !isSelected && selected.length >= pickCount
            return (
              <li
                key={card}
                className={`card-item ${isSelected ? 'card-item--selected' : ''} ${isDisabled ? 'card-item--disabled' : ''}`}
                onClick={() => !isDisabled && toggleCard(card)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  disabled={isDisabled}
                />
                {card}
              </li>
            )
          })}
        </ul>
        <div style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={confirmPicks} disabled={selected.length !== pickCount}>
            Confirm picks
          </button>
        </div>
      </div>

      <PickList />
    </div>
  )
}

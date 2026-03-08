import { useState, useEffect, useRef } from 'react'

// Draft step state machine per pack:
// 'pick1_own'  → pick 1 from your pack
// 'pick2_opp'  → pick 2 from opponent's pack (after trade)
// 'pick2_own'  → pick 2 from your pack (after trade back)

const STEPS = ['pick1_own', 'pick2_opp', 'pick2_own']

export default function DraftBoard({ packs, connection, role, onComplete }) {
  const myPackIndices = role === 'host' ? [0,1,2,3,4,5,6,7] : [8,9,10,11,12,13,14,15]

  const [packIndex, setPackIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [myPack, setMyPack] = useState([...packs[myPackIndices[0]]])
  const [oppPack, setOppPack] = useState(null)
  const [picks, setPicks] = useState([])
  const [selected, setSelected] = useState([])
  const [waitingForOpp, setWaitingForOpp] = useState(false)

  // Packs/signals received before we finished our current step
  const [pendingOppPack, setPendingOppPack] = useState(null)
  const [pendingMyPack, setPendingMyPack] = useState(null)
  const [pendingReadyNext, setPendingReadyNext] = useState(false)

  // Ref so the stable event listener always reads current state
  const stateRef = useRef({})
  stateRef.current = { stepIndex, packIndex, waitingForOpp, pendingOppPack, pendingMyPack }

  const step = STEPS[stepIndex]
  const pickCount = step === 'pick1_own' ? 1 : 2
  const activePack = step === 'pick2_opp' ? oppPack : myPack

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

  // Single stable listener — registered once per connection
  useEffect(() => {
    let active = true

    function handleIncoming(msg) {
      if (!active) return
      const { stepIndex: si, packIndex: pi, waitingForOpp: waiting } = stateRef.current
      console.log(`[DraftBoard] received ${msg.type} | stepIndex=${si} waitingForOpp=${waiting}`)

      if (msg.type === 'TRADE_PACK') {
        if (si === 0 && !waiting) {
          console.log('[DraftBoard] saving TRADE_PACK as pending (still picking)')
          setPendingOppPack(msg.pack)
        } else {
          console.log('[DraftBoard] applying TRADE_PACK → advancing to step 1')
          setOppPack(msg.pack)
          setStepIndex(1)
          setWaitingForOpp(false)
        }
      }

      if (msg.type === 'TRADE_BACK') {
        if (si === 1 && !waiting) {
          console.log('[DraftBoard] saving TRADE_BACK as pending (still picking)')
          setPendingMyPack(msg.pack)
        } else {
          console.log('[DraftBoard] applying TRADE_BACK → advancing to step 2')
          setMyPack(msg.pack)
          setStepIndex(2)
          setWaitingForOpp(false)
        }
      }

      if (msg.type === 'READY_NEXT') {
        if (si === 2 && !waiting) {
          // Haven't finished pick2_own yet — save signal for after we confirm
          console.log('[DraftBoard] saving READY_NEXT as pending (still picking)')
          setPendingReadyNext(true)
        } else {
          console.log('[DraftBoard] READY_NEXT → advancing to next pack')
          doAdvanceToNextPack(pi)
        }
      }
    }

    console.log('[DraftBoard] registering data listener')
    connection.on('data', handleIncoming)
    return () => {
      console.log('[DraftBoard] disabling data listener (StrictMode cleanup)')
      active = false
    }
  }, [connection])

  function confirmPicks() {
    if (selected.length !== pickCount) return
    console.log(`[DraftBoard] confirmPicks | step=${step} pendingOppPack=${!!pendingOppPack} pendingMyPack=${!!pendingMyPack} pendingReadyNext=${pendingReadyNext}`)

    const newPicks = [...picks, ...selected]
    setPicks(newPicks)
    setSelected([])

    if (step === 'pick1_own') {
      const remaining = myPack.filter(c => !selected.includes(c))
      setMyPack(remaining)
      connection.send({ type: 'TRADE_PACK', pack: remaining })

      if (pendingOppPack) {
        setOppPack(pendingOppPack)
        setPendingOppPack(null)
        setStepIndex(1)
      } else {
        setWaitingForOpp(true)
      }

    } else if (step === 'pick2_opp') {
      const remaining = oppPack.filter(c => !selected.includes(c))
      connection.send({ type: 'TRADE_BACK', pack: remaining })

      if (pendingMyPack) {
        setMyPack(pendingMyPack)
        setPendingMyPack(null)
        setStepIndex(2)
      } else {
        setWaitingForOpp(true)
      }

    } else if (step === 'pick2_own') {
      if (packIndex === 7) {
        onComplete(newPicks)
      } else {
        connection.send({ type: 'READY_NEXT' })
        if (pendingReadyNext) {
          // Opponent already finished — advance immediately
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

  if (waitingForOpp) {
    return (
      <div>
        <h2>Pack {packIndex + 1} / 8</h2>
        <p>Waiting for opponent...</p>
        <p>Picks so far: {picks.length}</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Pack {packIndex + 1} / 8</h2>
      <p>{stepLabel} — {selected.length}/{pickCount} selected</p>
      <ul>
        {(activePack || []).map(card => (
          <li key={card}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(card)}
                onChange={() => toggleCard(card)}
                disabled={!selected.includes(card) && selected.length >= pickCount}
              />
              {card}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={confirmPicks} disabled={selected.length !== pickCount}>
        Confirm picks
      </button>
      <p>Picks so far: {picks.length}</p>
    </div>
  )
}

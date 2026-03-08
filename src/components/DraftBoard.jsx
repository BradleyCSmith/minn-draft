import { useState, useEffect, useRef } from 'react'

// Draft step state machine per pack:
// 'pick1_own'  → pick 1 from your pack
// 'pick2_opp'  → pick 2 from opponent's pack (after trade)
// 'pick2_own'  → pick 2 from your pack (after trade back)

const STEPS = ['pick1_own', 'pick2_opp', 'pick2_own']

export default function DraftBoard({ packs, channel, role, onComplete }) {
  const myPackIndices = role === 'host' ? [0,1,2,3,4,5,6,7] : [8,9,10,11,12,13,14,15]

  const [packIndex, setPackIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [myPack, setMyPack] = useState([...packs[myPackIndices[0]]])
  const [oppPack, setOppPack] = useState(null)
  const [picks, setPicks] = useState([])
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

  // Helper to send a message via Supabase broadcast
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

  // Listen for incoming messages from opponent via Supabase broadcast
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

    const newPicks = [...picks, ...selected]
    setPicks(newPicks)
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
        onComplete(newPicks)
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

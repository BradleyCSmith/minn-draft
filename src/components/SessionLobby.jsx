import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { generatePacks } from '../utils/packGenerator.js'

export default function SessionLobby({ role, cardPool, onReady }) {
  const [sessionCode, setSessionCode] = useState('')
  const [status, setStatus] = useState('')

  function handleHost() {
    const code = sessionCode.trim().toLowerCase()
    if (!code) return

    const channel = supabase.channel(`draft-${code}`)

    // Wait for guest to join — only accept the first JOIN received
    let guestJoined = false
    channel.on('broadcast', { event: 'JOIN' }, () => {
      if (guestJoined) return
      guestJoined = true
      setStatus('Guest connected! Starting draft...')
      const packs = generatePacks(cardPool)
      channel.send({ type: 'broadcast', event: 'START', payload: { packs } })
      onReady(channel, packs)
    })

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        setStatus(`Waiting for guest to join with code: "${code}"`)
      }
    })
  }

  function handleJoin() {
    const code = sessionCode.trim().toLowerCase()
    if (!code) return

    const channel = supabase.channel(`draft-${code}`)

    // Wait for host to send packs
    channel.on('broadcast', { event: 'START' }, ({ payload }) => {
      onReady(channel, payload.packs)
    })

    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'JOIN', payload: {} })
        setStatus('Connected! Waiting for host to start...')
      }
    })

    setStatus('Connecting...')
  }

  if (role === 'host') {
    return (
      <div>
        <h2>Host a Session</h2>
        <p>Choose a short code to share with your opponent:</p>
        <input
          type="text"
          placeholder="e.g. banana"
          value={sessionCode}
          onChange={e => setSessionCode(e.target.value)}
        />
        <button onClick={handleHost} disabled={!sessionCode.trim()}>
          Create Session
        </button>
        <p>{status}</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Join a Session</h2>
      <p>Enter the session code from your host:</p>
      <input
        type="text"
        placeholder="e.g. banana"
        value={sessionCode}
        onChange={e => setSessionCode(e.target.value)}
      />
      <button onClick={handleJoin} disabled={!sessionCode.trim()}>
        Join
      </button>
      <p>{status}</p>
    </div>
  )
}

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
        setStatus(`Waiting for guest to join...`)
      }
    })
  }

  function handleJoin() {
    const code = sessionCode.trim().toLowerCase()
    if (!code) return

    const channel = supabase.channel(`draft-${code}`)

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
      <div className="panel" style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h2 className="section-title">Host a Session</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Choose a short code to share with your opponent:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            className="input"
            type="text"
            placeholder="e.g. banana"
            value={sessionCode}
            onChange={e => setSessionCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleHost()}
          />
          <button className="btn" onClick={handleHost} disabled={!sessionCode.trim()}>
            Create
          </button>
        </div>
        {status && (
          <>
            <div className="session-code">{sessionCode.trim().toLowerCase()}</div>
            <p className="status">{status}</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="panel" style={{ maxWidth: 480, margin: '4rem auto' }}>
      <h2 className="section-title">Join a Session</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Enter the session code from your host:
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          className="input"
          type="text"
          placeholder="e.g. banana"
          value={sessionCode}
          onChange={e => setSessionCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button className="btn" onClick={handleJoin} disabled={!sessionCode.trim()}>
          Join
        </button>
      </div>
      {status && <p className="status">{status}</p>}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { generatePacks } from '../utils/packGenerator.js'

export default function SessionLobby({ role, cardPool, peerId, connect, onConnection, onReady }) {
  const [joinCode, setJoinCode] = useState('')
  const [status, setStatus] = useState('')

  // HOST: wait for guest to connect, then generate and send packs
  useEffect(() => {
    if (role !== 'host') return

    onConnection((conn) => {
      setStatus('Guest connected! Starting draft...')
      const packs = generatePacks(cardPool)
      conn.send({ type: 'START', packs })
      onReady(conn, packs)
    })
  }, [role, cardPool])

  // GUEST: connect to host, wait for START message
  function handleJoin() {
    const conn = connect(joinCode.trim())
    setStatus('Connecting to host...')

    conn.on('open', () => setStatus('Connected! Waiting for host to start...'))

    conn.on('data', (msg) => {
      if (msg.type === 'START') {
        onReady(conn, msg.packs)
      }
    })
  }

  if (role === 'host') {
    return (
      <div>
        <h2>Hosting Session</h2>
        <p>Share this code with your opponent:</p>
        <strong>{peerId || 'Generating code...'}</strong>
        <p>{status}</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Join Session</h2>
      <p>Enter the session code from your host:</p>
      <input
        type="text"
        placeholder="Enter session code"
        value={joinCode}
        onChange={e => setJoinCode(e.target.value)}
      />
      <button onClick={handleJoin} disabled={!joinCode.trim()}>
        Join
      </button>
      <p>{status}</p>
    </div>
  )
}

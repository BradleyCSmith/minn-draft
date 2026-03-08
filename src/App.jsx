import { useState } from 'react'
import CardPoolImport from './components/CardPoolImport.jsx'
import SessionLobby from './components/SessionLobby.jsx'
import DraftBoard from './components/DraftBoard.jsx'
import DecklistExport from './components/DecklistExport.jsx'
import usePeer from './hooks/usePeer.js'

// App-level state machine:
// 'start' → host: 'import' → 'lobby' → 'draft' → 'export'
// 'start' → guest:           'lobby' → 'draft' → 'export'

export default function App() {
  const [screen, setScreen] = useState('start')
  const [role, setRole] = useState(null)
  const [cardPool, setCardPool] = useState([])
  const [packs, setPacks] = useState([])
  const [connection, setConnection] = useState(null)
  const [picks, setPicks] = useState([])

  // Peer lives at App level so it isn't destroyed when SessionLobby unmounts
  const { peerId, connect, onConnection } = usePeer()

  function handleRoleSelect(selectedRole) {
    setRole(selectedRole)
    setScreen(selectedRole === 'host' ? 'import' : 'lobby')
  }

  function handlePoolImported(cards) {
    setCardPool(cards)
    setScreen('lobby')
  }

  function handleSessionReady(conn, generatedPacks) {
    setConnection(conn)
    setPacks(generatedPacks)
    setScreen('draft')
  }

  function handleDraftComplete(draftedCards) {
    setPicks(draftedCards)
    setScreen('export')
  }

  return (
    <div>
      {screen === 'start' && (
        <div>
          <h1>Minneapolis Draft</h1>
          <button onClick={() => handleRoleSelect('host')}>Host a Session</button>
          <button onClick={() => handleRoleSelect('guest')}>Join a Session</button>
        </div>
      )}
      {screen === 'import' && (
        <CardPoolImport onImport={handlePoolImported} />
      )}
      {screen === 'lobby' && (
        <SessionLobby
          role={role}
          cardPool={cardPool}
          peerId={peerId}
          connect={connect}
          onConnection={onConnection}
          onReady={handleSessionReady}
        />
      )}
      {screen === 'draft' && (
        <DraftBoard
          packs={packs}
          connection={connection}
          role={role}
          onComplete={handleDraftComplete}
        />
      )}
      {screen === 'export' && (
        <DecklistExport picks={picks} />
      )}
    </div>
  )
}

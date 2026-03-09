import { useState } from 'react'
import CardPoolImport from './components/CardPoolImport.jsx'
import SessionLobby from './components/SessionLobby.jsx'
import DraftBoard from './components/DraftBoard.jsx'
import DecklistExport from './components/DecklistExport.jsx'

export default function App() {
  const [screen, setScreen] = useState('start')
  const [role, setRole] = useState(null)
  const [cardPool, setCardPool] = useState([])
  const [packs, setPacks] = useState([])
  const [channel, setChannel] = useState(null)
  const [picks, setPicks] = useState([])
  const [sideboard, setSideboard] = useState([])

  function handleRoleSelect(selectedRole) {
    setRole(selectedRole)
    setScreen(selectedRole === 'host' ? 'import' : 'lobby')
  }

  function handlePoolImported(cards) {
    setCardPool(cards)
    setScreen('lobby')
  }

  function handleSessionReady(supabaseChannel, generatedPacks) {
    setChannel(supabaseChannel)
    setPacks(generatedPacks)
    setScreen('draft')
  }

  function handleDraftComplete(main, side) {
    setPicks(main)
    setSideboard(side)
    setScreen('export')
  }

  return (
    <div className="page">
      {screen === 'start' && (
        <div className="start-screen">
          <h1 className="title">Minneapolis Draft</h1>
          <p className="subtitle">Two-player cube draft</p>
          <div className="btn-group">
            <button className="btn btn-large" onClick={() => handleRoleSelect('host')}>Host a Session</button>
            <button className="btn btn-large" onClick={() => handleRoleSelect('guest')}>Join a Session</button>
          </div>
        </div>
      )}
      {screen === 'import' && (
        <CardPoolImport onImport={handlePoolImported} />
      )}
      {screen === 'lobby' && (
        <SessionLobby
          role={role}
          cardPool={cardPool}
          onReady={handleSessionReady}
        />
      )}
      {screen === 'draft' && (
        <DraftBoard
          packs={packs}
          channel={channel}
          role={role}
          onComplete={handleDraftComplete}
        />
      )}
      {screen === 'export' && (
        <DecklistExport picks={picks} sideboard={sideboard} />
      )}
    </div>
  )
}

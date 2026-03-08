import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'

export default function usePeer() {
  const peerRef = useRef(null)
  const [peerId, setPeerId] = useState(null)
  const connectionCallbackRef = useRef(null)

  useEffect(() => {
    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', id => setPeerId(id))

    peer.on('connection', conn => {
      conn.on('open', () => {
        if (connectionCallbackRef.current) {
          connectionCallbackRef.current(conn)
        }
      })
    })

    return () => peer.destroy()
  }, [])

  function connect(remotePeerId) {
    return peerRef.current.connect(remotePeerId)
  }

  function onConnection(callback) {
    connectionCallbackRef.current = callback
  }

  return { peerId, connect, onConnection }
}

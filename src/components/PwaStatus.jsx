import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

function PwaStatus() {
  const [message, setMessage] = useState('')
  const [updateReady, setUpdateReady] = useState(false)
  const applyUpdate = useRef(null)

  useEffect(() => {
    applyUpdate.current = registerSW({
      immediate: true,
      onOfflineReady() {
        setMessage('CitelCell ready for offline use')
        window.setTimeout(() => setMessage(''), 4500)
      },
      onNeedRefresh() {
        setUpdateReady(true)
      },
      onRegisterError(error) {
        console.error('CitelCell offline setup could not be completed.', error)
      },
    })
  }, [])

  if (updateReady) {
    return <aside className="pwa-update" role="status"><span>A CitelCell update is ready.</span><button type="button" onClick={() => applyUpdate.current?.(true)}>Update now</button><button type="button" aria-label="Dismiss update" onClick={() => setUpdateReady(false)}>×</button></aside>
  }
  return message ? <div className="offline-ready" role="status">✓ {message}</div> : null
}

export default PwaStatus

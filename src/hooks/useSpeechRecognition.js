import { useCallback, useEffect, useRef, useState } from 'react'

const languageCodes = {
  Marathi: 'mr-IN',
  Hindi: 'hi-IN',
  English: 'en-IN',
}

function resolveLanguage(language) {
  if (languageCodes[language]) return languageCodes[language]
  const deviceLanguage = typeof navigator !== 'undefined' ? navigator.language : ''
  return /^(?:mr|hi|en)(?:-|$)/i.test(deviceLanguage) ? deviceLanguage : 'hi-IN'
}

export function useSpeechRecognition({ language = 'Auto / Mixed', onFinalTranscript }) {
  const [supported] = useState(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  const [active, setActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [status, setStatus] = useState('Microphone Off')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  const shouldContinueRef = useRef(false)
  const finalCallbackRef = useRef(onFinalTranscript)
  const languageRef = useRef(language)

  useEffect(() => { finalCallbackRef.current = onFinalTranscript }, [onFinalTranscript])
  useEffect(() => { languageRef.current = language }, [language])

  const stopListening = useCallback(() => {
    shouldContinueRef.current = false
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    restartTimerRef.current = null
    setActive(false)
    setListening(false)
    setInterimTranscript('')
    setStatus('Microphone Off')
    try {
      recognitionRef.current?.stop()
    } catch {
      setListening(false)
    }
  }, [])

  const startListening = useCallback(() => {
    if (!supported || shouldContinueRef.current) return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = resolveLanguage(languageRef.current)
    recognitionRef.current = recognition
    shouldContinueRef.current = true
    setActive(true)
    setError('')
    setStatus('Starting microphone…')

    recognition.onstart = () => {
      setListening(true)
      setStatus('Listening…')
      setError('')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript || ''
        if (event.results[index].isFinal) finalText += `${text} `
        else interim += `${text} `
      }
      setInterimTranscript(interim.trim().slice(-500))
      const cleanFinal = finalText.trim().slice(-800)
      if (cleanFinal) {
        setInterimTranscript('')
        finalCallbackRef.current?.(cleanFinal)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted' && !shouldContinueRef.current) return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldContinueRef.current = false
        setActive(false)
        setError('Microphone permission was denied. Allow microphone access in browser settings, then try again.')
        setStatus('Permission denied')
      } else if (event.error === 'no-speech') {
        setError('No speech detected. You can keep speaking or use manual input.')
        setStatus('No speech detected')
      } else if (event.error === 'audio-capture') {
        shouldContinueRef.current = false
        setActive(false)
        setError('No working microphone was found.')
        setStatus('Microphone unavailable')
      } else {
        shouldContinueRef.current = false
        setActive(false)
        setError(`Speech recognition stopped: ${event.error || 'unknown error'}. Manual input is still available.`)
        setStatus('Recognition error')
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterimTranscript('')
      if (!shouldContinueRef.current) {
        setStatus((current) => current === 'Listening…' || current === 'Starting microphone…' ? 'Microphone Off' : current)
        return
      }
      setStatus('Restarting listening…')
      restartTimerRef.current = window.setTimeout(() => {
        if (!shouldContinueRef.current) return
        try {
          recognition.start()
        } catch {
          shouldContinueRef.current = false
          setActive(false)
          setStatus('Recognition stopped')
          setError('Listening stopped unexpectedly. Press Start Listening to try again.')
        }
      }, 250)
    }

    try {
      recognition.start()
    } catch {
      shouldContinueRef.current = false
      setActive(false)
      setStatus('Recognition stopped')
      setError('Could not start speech recognition. Manual input is still available.')
    }
  }, [supported])

  useEffect(() => () => {
    shouldContinueRef.current = false
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch { /* Recognition may already be closed. */ }
  }, [])

  return {
    supported,
    active,
    listening,
    interimTranscript,
    status,
    error,
    recognitionLanguageCode: resolveLanguage(language),
    startListening,
    stopListening,
  }
}

const LANGUAGE_CODES = { English: 'en-IN', Hindi: 'hi-IN', Marathi: 'mr-IN' }
const SPEECH_RATES = { Slow: 0.82, Normal: 1, Fast: 1.18 }

function words(value = '') {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
}

function isNearDuplicate(left, right) {
  const a = new Set(words(left))
  const b = new Set(words(right))
  if (!a.size || !b.size) return false
  let shared = 0
  a.forEach((word) => { if (b.has(word)) shared += 1 })
  return shared / Math.max(a.size, b.size) >= 0.72
}

function resolveCueLanguage(language, responseLanguage) {
  if (LANGUAGE_CODES[language]) return language
  if (responseLanguage === 'Marathi' || responseLanguage === 'Hindi') return responseLanguage
  return 'English'
}

const CUES = {
  English: {
    price_isolate: 'Price objection. Isolate the concern.', price_value: "Don't discount. Explore value.", price_commit: 'Test commitment before negotiating.',
    discount: 'Buying signal. Confirm before discount.', think: 'Find the real concern.', no_need: "Don't pitch. Explore current process.",
    status: 'Find one reason to change.', decision: 'Decision maker issue. Include them.', details: 'Qualify what details they need.',
    competitor: "Don't attack competitor. Find the gap.", trust: 'Reduce risk. Give proof.', proof: 'Show proof before asking commitment.',
    usability: 'Find where usage feels difficult.', adoption: 'Explore the adoption friction.', payment: 'Buying signal. Move to payment.',
    implementation: "They're ready. Confirm setup.", strong: 'Stop pitching. Ask for commitment.', general: 'Listen closely. Ask one question.',
  },
  Hindi: {
    price_isolate: 'Price concern है. असली objection पूछो.', price_value: 'अभी discount मत दो. Value समझो.', price_commit: 'Negotiation से पहले commitment check करो.',
    discount: 'Buying signal है. Discount से पहले confirm करो.', think: 'असल concern पता करो.', no_need: 'Pitch मत करो. Current process समझो.',
    status: 'Change का एक reason ढूंढो.', decision: 'Decision maker को discussion में लाओ.', details: 'कौनसी details चाहिए, qualify करो.',
    competitor: 'Competitor को attack मत करो. Gap ढूंढो.', trust: 'Risk कम करो. Proof दो.', proof: 'Commitment से पहले proof दिखाओ.',
    usability: 'Usage कहाँ difficult है, पूछो.', adoption: 'Adoption friction समझो.', payment: 'Buying signal है. Payment पर जाओ.',
    implementation: 'Customer ready है. Setup confirm करो.', strong: 'Pitch बंद करो. Commitment मांगो.', general: 'ध्यान से सुनो. एक सवाल पूछो.',
  },
  Marathi: {
    price_isolate: 'Price concern आहे. खरी अडचण शोधा.', price_value: 'किंमत लगेच कमी करू नका. Value शोधा.', price_commit: 'Negotiation आधी commitment तपासा.',
    discount: 'Buying signal आहे. Discount आधी confirm करा.', think: 'आता खरी अडचण शोधा.', no_need: 'Pitch करू नका. Current process समजा.',
    status: 'बदलाचं एक कारण शोधा.', decision: 'Decision maker ला discussion मध्ये आणा.', details: 'कोणती details हवी ते विचारा.',
    competitor: 'Competitor वर टीका नको. Gap शोधा.', trust: 'Risk कमी करा. Proof द्या.', proof: 'Commitment आधी proof दाखवा.',
    usability: 'Usage कुठे difficult आहे ते शोधा.', adoption: 'Adoption friction समजून घ्या.', payment: 'Buying signal आहे. Payment कडे जा.',
    implementation: 'Customer ready आहे. Setup confirm करा.', strong: 'Pitch थांबवा. Commitment विचारा.', general: 'नीट ऐका. एक प्रश्न विचारा.',
  },
}

export function generateEarCue({ primaryIntent = 'GENERAL', technique = '', buyingSignal = 'None', responseLanguage = 'English', earLanguage = 'Auto' }) {
  const language = resolveCueLanguage(earLanguage, responseLanguage)
  let key = 'general'
  if (primaryIntent === 'PAYMENT' && buyingSignal === 'Strong') key = 'payment'
  else if (primaryIntent === 'IMPLEMENTATION' && buyingSignal === 'Strong') key = 'implementation'
  else if (primaryIntent === 'DISCOUNT') key = 'discount'
  else if (primaryIntent === 'PRICE_VALUE') {
    if (/Objection Isolation/i.test(technique)) key = 'price_isolate'
    else if (/Trial|Commitment|Discount/i.test(technique)) key = 'price_commit'
    else key = 'price_value'
  } else if (primaryIntent === 'THINK_ABOUT_IT') key = 'think'
  else if (primaryIntent === 'NO_NEED') key = 'no_need'
  else if (primaryIntent === 'STATUS_QUO') key = 'status'
  else if (['DECISION_AUTHORITY', 'PARTNER_APPROVAL', 'OWNER_UNAVAILABLE'].includes(primaryIntent)) key = 'decision'
  else if (primaryIntent === 'SEND_DETAILS') key = 'details'
  else if (primaryIntent === 'COMPETITOR') key = 'competitor'
  else if (primaryIntent === 'TRUST') key = 'trust'
  else if (primaryIntent === 'PROOF_TRIAL') key = 'proof'
  else if (primaryIntent === 'USABILITY') key = 'usability'
  else if (primaryIntent === 'ADOPTION_CONCERN') key = 'adoption'
  else if (buyingSignal === 'Strong') key = 'strong'
  const priority = buyingSignal === 'Strong' ? 'HIGH' : ['DECISION_AUTHORITY', 'PARTNER_APPROVAL', 'DISCOUNT'].includes(primaryIntent) ? 'HIGH' : primaryIntent === 'GENERAL' ? 'LOW' : 'NORMAL'
  return { text: CUES[language][key], priority, interruptible: priority !== 'CRITICAL', language }
}

export function isEarCoachSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function createEarCoachSession({ cooldownMs = 2500 } = {}) {
  let lastSpokenTurnId = ''
  let lastSpokenTranscript = ''
  let lastSpokenCue = ''
  let lastSpokenAt = 0

  function cancel() {
    if (isEarCoachSupported()) window.speechSynthesis.cancel()
  }

  function reset() {
    cancel()
    lastSpokenTurnId = ''
    lastSpokenTranscript = ''
    lastSpokenCue = ''
    lastSpokenAt = 0
  }

  function speak({ turnId, transcript = '', cue, language = 'English', rate = 'Normal', enabled, muted, force = false, onStart, onEnd }) {
    if (!enabled || muted || !cue?.text || !isEarCoachSupported()) return { spoken: false, reason: 'disabled' }
    const now = Date.now()
    const duplicate = turnId && turnId === lastSpokenTurnId
      || transcript && transcript.trim().toLowerCase() === lastSpokenTranscript
      || isNearDuplicate(cue.text, lastSpokenCue)
    const coolingDown = now - lastSpokenAt < cooldownMs
    if (!force && (duplicate || (coolingDown && !['HIGH', 'CRITICAL'].includes(cue.priority)))) return { spoken: false, reason: duplicate ? 'duplicate' : 'cooldown' }

    cancel()
    const utterance = new window.SpeechSynthesisUtterance(cue.text)
    const resolvedLanguage = resolveCueLanguage(language, cue.language)
    utterance.lang = LANGUAGE_CODES[resolvedLanguage]
    utterance.rate = SPEECH_RATES[rate] || SPEECH_RATES.Normal
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()))
      || null
    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onEnd?.()
    lastSpokenTurnId = turnId || ''
    lastSpokenTranscript = transcript.trim().toLowerCase()
    lastSpokenCue = cue.text
    lastSpokenAt = now
    window.speechSynthesis.speak(utterance)
    return { spoken: true }
  }

  return { speak, cancel, reset, getLastSpoken: () => ({ lastSpokenTurnId, lastSpokenCue, lastSpokenAt }) }
}

export function getEarCoachTestCue(language) {
  if (language === 'Hindi') return { text: 'Ear coach ready hai.', priority: 'HIGH', language: 'Hindi' }
  if (language === 'Marathi') return { text: 'Ear coach ready आहे.', priority: 'HIGH', language: 'Marathi' }
  return { text: 'Ear coach ready.', priority: 'HIGH', language: 'English' }
}

const CONCEPT_RULES = {
  PRICE: [/(?:mahag|महाग|mehenga|महंगा|महंगी|costly|expensive)/i, /(?:price|rate|kimat|किंमत).*(?:jast|jasta|जास्त|zyada|ज्यादा|high)/i, /budget ke bahar/i],
  THINK: [/(?:vichar karto|vichar karun sangto|विचार करून सांगतो|soch ke batata hu|sochna padega|think about it|let me think)/i],
  NO_NEED: [/(?:garaj nahi|गरज नाही|zarurat nahi|जरूरत नहीं|ज़रूरत नहीं|requirement nahi|need nahi|abhi nahi chahiye|आत्ता गरज नाही)/i],
  OWNER: [/(?:malak nahi|मालक नाही|owner nahi|owner.*available nahi|sir nahi hai|malak.*(?:उद्या|udya|tomorrow)|मालक.*(?:उद्या|tomorrow))/i],
  SEND_DETAILS: [/(?:details pathva|माहिती पाठवा|whatsapp var pathva|details bhejo|whatsapp karo|send details)/i],
  COMPETITOR: [/(?:already use karto|already use karte hai|dusra (?:pos|system)|existing system|already have one)/i],
  DISCOUNT: [/(?:discount|kam karo|thoda kam|rate kami kara|किंमत कमी करा|best price|final price)/i],
  DECISION_MAKER: [/(?:partner sobat|partner se|manager se|owner se|discuss karke|approval lena padega)/i],
  TIMING: [/(?:nantar|baad me|later|kal|उद्या|tomorrow|next week)/i],
  SETUP: [/(?:setup|install|installation)/i],
  PAYMENT: [/(?:payment|pay|upi|cash|bank transfer|card payment)/i],
}

const CANONICAL = {
  PRICE: 'price expensive', THINK: 'think about it', NO_NEED: 'no need', OWNER: 'owner unavailable',
  SEND_DETAILS: 'send details whatsapp', COMPETITOR: 'competitor already using other vendor',
  DISCOUNT: 'discount best price', DECISION_MAKER: 'partner approval discuss', TIMING: 'call later tomorrow',
  SETUP: 'setup install', PAYMENT: 'payment',
}

export function normalizeSalesConversation(value = '') {
  const original = String(value).replace(/\s+/g, ' ').trim()
  const concepts = Object.entries(CONCEPT_RULES)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(original)))
    .map(([concept]) => concept)
  const canonical = concepts.map((concept) => CANONICAL[concept]).join(' ')
  return { original, concepts, normalized: `${original.toLowerCase()} ${canonical}`.trim() }
}

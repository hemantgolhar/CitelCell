import { normalizeSalesConversation } from './salesLanguageNormalizer.js'

export const SALES_INTENTS = [
  'PRICE_VALUE', 'THINK_ABOUT_IT', 'NO_NEED', 'STATUS_QUO', 'OWNER_UNAVAILABLE', 'DECISION_AUTHORITY',
  'PARTNER_APPROVAL', 'SEND_DETAILS', 'CALL_LATER', 'COMPETITOR', 'BUDGET', 'TRUST', 'PROOF_TRIAL',
  'USABILITY', 'ADOPTION_CONCERN', 'TIME_EFFORT', 'IMPLEMENTATION', 'CUSTOMIZATION', 'PAYMENT', 'DISCOUNT',
  'BUYING_SIGNAL', 'NOT_INTERESTED', 'GENERAL',
]

const EXAMPLES = {
  PRICE_VALUE: ['2500 सिर्फ card के लिए?', 'इतके पैसे देऊन मला काय मिळणार?', 'Isme actual फायदा क्या है?', 'Seems expensive for what it does.', 'इतका खर्च justify कसा होईल?', 'Price jast aahe for this value.', 'Price किती?', 'What does it cost?'],
  THINK_ABOUT_IT: ['I need to think about it.', 'Soch ke batata hu.', 'मी विचार करून सांगतो.', 'Thoda vichar karun sangto.', 'Let me consider it first.'],
  NO_NEED: ['We do not need this right now.', 'Abhi requirement nahi hai.', 'आत्ता गरज नाही.', 'Sadhya yachi garaj vatat nahi.', 'There is no requirement currently.'],
  STATUS_QUO: ['Abhi jo system hai wo thik chal raha hai.', 'सध्याचं ठीक चाललंय.', "We're fine with what we have.", 'Already current process works.', 'Menu change hi kitni baar hota hai.', 'Already menu aahe.'],
  OWNER_UNAVAILABLE: ['Owner is not available.', 'Owner abhi nahi hai.', 'मालक आज नाहीत.', 'Malak udya yetil.', 'Sir baad me milenge.'],
  DECISION_AUTHORITY: ['मी एकटा decision घेऊ शकत नाही.', 'I need management approval.', 'Mere haath me decision nahi hai.', 'Someone else has to approve this.', 'Owner se confirmation chahiye.'],
  PARTNER_APPROVAL: ['Partner decide karega.', 'Partner se discuss karna padega.', 'Partner sobat bolun sangto.', 'I must discuss it with my partner.', 'पार्टनरची approval लागेल.'],
  SEND_DETAILS: ['Send me the details.', 'WhatsApp var details pathva.', 'Details WhatsApp pe bhejo.', 'माहिती पाठवा.', 'Share the brochure first.'],
  CALL_LATER: ['Call me later.', 'Baad me phone karo.', 'नंतर call करा.', 'Next week baat karte hain.', 'Udya call kara.'],
  COMPETITOR: ['We are comparing another vendor.', 'Dusra POS bhi dekh rahe hain.', 'दुसरा option बघतोय.', 'Your competitor offers this.', 'We already use another product.'],
  BUDGET: ['There is no budget right now.', 'Budget ke bahar hai.', 'इतका budget नाही.', 'We cannot afford it currently.', 'Paise approve nahi hue.'],
  TRUST: ['How can I trust this company?', 'Is this reliable?', 'यावर विश्वास कसा ठेवू?', 'Koi guarantee hai kya?', 'How do I know your claims are genuine?'],
  PROOF_TRIAL: ['पहिले वापरून बघितल्याशिवाय कसं घेऊ?', 'Can I try it first?', 'Pehle demo use karke dekhna hai.', 'How do I know it actually works?', 'Trial milega kya?'],
  USABILITY: ['Mere staff ko difficult padega.', 'Staff ko samajh nahi aayega.', 'हे वापरणं अवघड नाही ना?', 'Will my team be able to use it?', 'Training mein problem hogi.'],
  ADOPTION_CONCERN: ["I don't know if customers will actually use this.", 'Customer scan karenge kya?', 'लोक हे वापरतील का?', 'Mere customers ko samjhega nahi.', 'Humare customers review dete hi nahi.', 'Will people adopt it?'],
  TIME_EFFORT: ['This will take too much time.', 'Setup mein kitna effort lagega?', 'हे manage करायला वेळ जाईल.', 'Staff is too busy for this.', 'How long will changes take?'],
  IMPLEMENTATION: ['Tomorrow setup kar sakte ho?', 'How quickly can you install it?', 'उद्या setup होईल का?', 'Implementation kitne din me hoga?', 'Change करायला किती वेळ लागतो?'],
  CUSTOMIZATION: ['Can we customize it?', 'Logo aur colors change honge?', 'आपल्या business प्रमाणे बदलता येईल?', 'Custom design milega kya?', 'Can this fit our process?'],
  PAYMENT: ['Payment kaise karna hai?', 'Can I pay by UPI?', 'पैसे कसे द्यायचे?', 'Send the payment link.', 'What are the payment terms?'],
  DISCOUNT: ['Can you give a discount?', 'Discount kitna doge?', 'Rate kami kara.', 'किंमत कमी करा.', 'What is your final best price?'],
  BUYING_SIGNAL: ['How do we start?', 'Please confirm the order.', 'Kal install kar do.', 'What is the next step to buy?', 'Invoice bhej do.', 'I am ready to proceed.'],
  NOT_INTERESTED: ['I am not interested.', 'Mujhe nahi chahiye.', 'मला नको आहे.', 'Please do not follow up.', 'This is not for us.'],
  GENERAL: ['Tell me more.', 'I have a question.', 'थोडी माहिती द्या.', 'Aur batao.', 'Let us discuss the business.'],
}

const RULE_INTENT_MAP = {
  PRICE: 'PRICE_VALUE', THINK: 'THINK_ABOUT_IT', NO_NEED: 'NO_NEED', OWNER: 'OWNER_UNAVAILABLE',
  SEND_DETAILS: 'SEND_DETAILS', COMPETITOR: 'COMPETITOR', DISCOUNT: 'DISCOUNT',
  DECISION_MAKER: 'DECISION_AUTHORITY', TIMING: 'CALL_LATER', SETUP: 'IMPLEMENTATION', PAYMENT: 'PAYMENT',
}

let extractorPromise
let exampleEmbeddingsPromise
let modelState = 'idle'
let modelError = ''
const TRANSFORMERS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm'

function tokens(value) {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
}

function lexicalSimilarity(a, b) {
  const left = new Set(tokens(a))
  const right = new Set(tokens(b))
  if (!left.size || !right.size) return 0
  let overlap = 0
  left.forEach((token) => { if (right.has(token)) overlap += 1 })
  return overlap / Math.sqrt(left.size * right.size)
}

function rank(items) {
  return items.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

const PAYMENT_EVIDENCE = /(?:payment|pay\b|upi|qr\b|advance|card se payment|card ने payment|पैसे कसे द्यायचे|payment.*(?:kaise|kasa|कसे|kab|when)|(?:kaise|kasa|कसे|when).*(?:payment|pay))/i
const IMPLEMENTATION_EVIDENCE = /(?:setup|install(?:ation)?|implementation|start (?:kar|कर|today|tomorrow)|(?:kal|tomorrow|उद्या).*(?:start|setup|install)|(?:start|setup|install).*(?:kal|tomorrow|उद्या))/i
const PURCHASE_ACTION_EVIDENCE = /(?:how do (?:i|we) (?:pay|order|start)|order (?:kaise|kasa|कसा)|start (?:karte|karuya|करूया|करते)|(?:upi|qr).*(?:bhejo|send|pathva|पाठवा)|(?:bhejo|send|pathva|पाठवा).*(?:upi|qr)|\b\d+\s*(?:cards?|कार्ड).*(?:chahiye|पाहिजे|हवे)|(?:cards?|कार्ड).*(?:chahiye|पाहिजे|हवे))/i
const PRICE_WORDS = /(?:price|cost|rate|mehenga|महंगा|महाग|jast|jasta|जास्त|high|इतके पैसे|rupaye|rupees?|रुपये|₹)/i
const MONEY_AMOUNT = /(?:₹\s*)?\b\d{2,7}(?:[,.]\d+)?\b(?:\s*(?:rs\.?|inr|rupees?|rupaye|रुपये))?/i
const DISCOUNT_EVIDENCE = /(?:discount|best price|final price|kam karo|kami kara|कमी करा|milnar ka|milega kya)/i

function upsertCandidate(items, intent, confidence, source = 'deterministic-guardrail') {
  const existing = items.find((item) => item.intent === intent)
  if (existing) existing.confidence = Math.max(existing.confidence, confidence)
  else items.push({ intent, confidence, source })
}

function applyIntentGuardrails(text, candidates) {
  const value = String(text).trim()
  const payment = PAYMENT_EVIDENCE.test(value)
  const implementation = IMPLEMENTATION_EVIDENCE.test(value)
  const purchaseAction = PURCHASE_ACTION_EVIDENCE.test(value)
  const discount = DISCOUNT_EVIDENCE.test(value)
  const price = PRICE_WORDS.test(value) || MONEY_AMOUNT.test(value)
  const buyingAction = payment || implementation || purchaseAction
  const guarded = candidates
    .filter((candidate) => candidate.intent !== 'PAYMENT' || payment)
    .filter((candidate) => candidate.intent !== 'IMPLEMENTATION' || implementation)
    .filter((candidate) => candidate.intent !== 'BUYING_SIGNAL' || buyingAction)

  if (price && !payment) upsertCandidate(guarded, 'PRICE_VALUE', 0.94)
  if (payment) {
    upsertCandidate(guarded, 'PAYMENT', 0.97)
    upsertCandidate(guarded, 'BUYING_SIGNAL', 0.95)
  }
  if (implementation) {
    upsertCandidate(guarded, 'IMPLEMENTATION', 0.96)
    upsertCandidate(guarded, 'BUYING_SIGNAL', 0.95)
  }
  if (purchaseAction) upsertCandidate(guarded, 'BUYING_SIGNAL', 0.96)
  if (discount) upsertCandidate(guarded, 'DISCOUNT', 0.97)
  return rank(guarded)
}

export function classifySalesIntentFallback(text) {
  const normalized = normalizeSalesConversation(text)
  const scores = Object.entries(EXAMPLES).map(([intent, examples]) => ({
    intent,
    confidence: Math.max(...examples.map((example) => lexicalSimilarity(normalized.original, example))),
    source: 'local-fallback',
  }))
  normalized.concepts.forEach((concept) => {
    const intent = RULE_INTENT_MAP[concept]
    const candidate = scores.find((item) => item.intent === intent)
    if (candidate) candidate.confidence = Math.max(candidate.confidence, 0.88)
  })
  const ranked = applyIntentGuardrails(text, scores)
  return ranked[0]?.confidence >= 0.24 ? ranked : [{ intent: 'GENERAL', confidence: 0.25, source: 'local-fallback' }]
}

async function getExtractor() {
  if (!extractorPromise) {
    modelState = 'loading'
    extractorPromise = import(/* @vite-ignore */ TRANSFORMERS_MODULE_URL)
      .then(({ env, pipeline }) => {
        env.allowLocalModels = false
        return pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8' })
      })
      .then((extractor) => {
        modelState = 'ready'
        return extractor
      })
      .catch((error) => {
        modelState = 'failed'
        modelError = error?.message || 'The local semantic model could not be prepared.'
        throw error
      })
  }
  return extractorPromise
}

async function getExampleEmbeddings() {
  if (!exampleEmbeddingsPromise) {
    exampleEmbeddingsPromise = getExtractor().then(async (extractor) => {
      const flat = Object.entries(EXAMPLES).flatMap(([intent, examples]) => examples.map((text) => ({ intent, text })))
      const output = await extractor(flat.map((item) => item.text), { pooling: 'mean', normalize: true })
      const vectors = output.tolist()
      return flat.map((item, index) => ({ ...item, vector: vectors[index] }))
    })
  }
  return exampleEmbeddingsPromise
}

function cosine(left, right) {
  let score = 0
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index]
  return score
}

export async function classifySalesIntent(text) {
  const fallback = classifySalesIntentFallback(text)
  try {
    const [extractor, examples] = await Promise.all([getExtractor(), getExampleEmbeddings()])
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    const vector = output.tolist()[0]
    const byIntent = new Map()
    examples.forEach((example) => {
      const score = cosine(vector, example.vector)
      byIntent.set(example.intent, Math.max(byIntent.get(example.intent) || -1, score))
    })
    fallback.forEach(({ intent, confidence }) => byIntent.set(intent, Math.min(1, Math.max(byIntent.get(intent) || 0, confidence + 0.06))))
    return applyIntentGuardrails(text, [...byIntent].map(([intent, confidence]) => ({ intent, confidence, source: 'semantic-model' })))
  } catch {
    return fallback
  }
}

export function getSemanticModelStatus() {
  return { state: modelState, error: modelError }
}

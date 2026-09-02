import { getProducts } from '../utils/pipeline.js'

export const CONVERSATION_STAGES = ['OPENING', 'DISCOVERY', 'PROBLEM_FOUND', 'VALUE_BUILDING', 'OBJECTION', 'BUYING_SIGNAL', 'NEGOTIATION', 'CLOSING']

const BUYING_SIGNALS = {
  strong: [/(?:how do we start|how can we start|payment.*(?:how|kaise|कसे|कैसे)|tomorrow.*install|install.*tomorrow|उद्या.*(?:install|setup)|कल.*(?:install|setup)|place (?:the )?order|ready to (?:start|buy)|invoice|agreement)/i],
  medium: [/(?:setup|install|delivery).*(?:how long|when|time|kitne din|किती वेळ|कितने दिन)|(?:kitne din|किती वेळ|कितने दिन).*(?:setup|install|delivery)|can we customize|customi[sz]|metal card.*(?:available|hai|आहे)|available.*metal card|what.*next step|next step.*(?:kya|काय|what)/i],
  weak: [/(?:demo|details|brochure|example|sample|features?|plan|package).*(?:send|show|share|dikh|पाठव|दाखव)|(?:interested|interesting|useful|acha hai|छान आहे|अच्छा है)/i],
}

const DECISION_MAKER = /(?:owner|malik|मालक|मालकाशी|मालिक|partner|manager|boss).*(?:not available|unavailable|nahi|नाही|नहीं|discuss|decide|approval|बोलावं|बोलावे|पूछ|puch|विचार)|(?:discuss|approval|decides?).*(?:owner|partner|manager|boss)/i
const DISCOUNT = /(?:discount|best price|कम कर|kami kara|कमी करा|less price|rate reduce)/i
const PROBLEM = /(?:problem|issue|difficult|manual|reprint|slow|waste|complaint|manage nahi|अडचण|समस्या|वेळ जातो|बार बार|वारंवार)/i
const CURRENT_PROCESS = /(?:we use|currently use|using|printed menu|manual|सध्या|अभी.*use|वापरतो|वापरतात)/i
const VALUE = /(?:help|benefit|useful|solve|improve|save time|फायदा|मदत|लाभ)/i
const CLOSE = /(?:final|confirm|book|buy|purchase|order|deal|invoice|payment|start today|आज.*start)/i

const ROOT_CAUSES = {
  PRICE: 'PRICE', NO_BUDGET: 'BUDGET', OWNER_UNAVAILABLE: 'AUTHORITY', PARTNER_APPROVAL: 'AUTHORITY',
  CALL_LATER: 'TIMING', NO_TIME: 'TIMING', TRUST: 'TRUST', NO_NEED: 'NEED', NOT_INTERESTED: 'NEED', COMPETITOR: 'COMPETITOR',
}

const PRODUCT_QUESTIONS = {
  'Smart Menu': {
    situation: ['How do you update menu items or prices today?', 'अभी menu items या prices कैसे update करते हैं?', 'सध्या menu items किंवा prices कसे update करता?'],
    problem: ['When prices change, what difficulty does reprinting create?', 'Price बदलने पर menu reprint करने में क्या problem आती है?', 'Menu prices बदलल्यावर reprint करताना काय अडचण येते?'],
    implication: ['How often do you need to reprint the menu in a year?', 'एक साल में menu कितनी बार reprint करना पड़ता है?', 'एका वर्षात menu किती वेळा reprint करावा लागतो?'],
    value: ['Would easier menu updates help your team respond faster?', 'अगर menu तुरंत update हो तो team को कितना फायदा होगा?', 'Menu पटकन update झाला तर team ला किती मदत होईल?'],
  },
  'Google Review Card': {
    situation: ['How do you currently ask customers for Google reviews?', 'अभी customers से Google review कैसे मांगते हैं?', 'सध्या customers ना Google review कसा मागता?'],
    problem: ['What usually stops happy customers from leaving a review?', 'Happy customers review क्यों नहीं दे पाते?', 'Happy customers review देताना कुठे थांबतात?'],
    implication: ['How does a low review response affect new customer trust?', 'कम reviews से new customers के trust पर क्या असर पड़ता है?', 'कमी reviews मुळे new customers च्या trust वर काय परिणाम होतो?'],
    value: ['Would a simpler review step help you collect more genuine feedback?', 'Review देना आसान हो तो genuine feedback बढ़ेगा क्या?', 'Review देणं सोपं झालं तर genuine feedback वाढेल का?'],
  },
  'Aura Smart Business Card': {
    situation: ['How do you share your contact and business details today?', 'अभी contact और business details कैसे share करते हैं?', 'सध्या contact आणि business details कसे share करता?'],
    problem: ['What happens when printed cards run out or details change?', 'Printed cards खत्म हों या details बदलें तो क्या दिक्कत होती है?', 'Printed cards संपले किंवा details बदलले तर काय अडचण होते?'],
    implication: ['How many opportunities are affected when details are not easy to save?', 'Details आसानी से save न हों तो कितने contacts miss होते हैं?', 'Details सहज save न झाल्यामुळे किती contacts miss होतात?'],
    value: ['Would one reusable card make sharing details easier for you?', 'एक reusable card से details share करना आसान होगा?', 'एक reusable card मुळे details share करणं सोपं होईल का?'],
  },
  'Citeltech POS': {
    situation: ['How do you currently manage billing and outlet reporting?', 'अभी billing और outlet reporting कैसे manage करते हैं?', 'सध्या billing आणि outlet reporting कसं manage करता?'],
    problem: ['Where do delays or mistakes happen in the current billing process?', 'Current billing में delay या mistakes कहाँ होते हैं?', 'सध्याच्या billing मध्ये delay किंवा चुका कुठे होतात?'],
    implication: ['How do those delays affect staff time or customer service?', 'इन delays का staff time या service पर क्या असर पड़ता है?', 'या delays मुळे staff time किंवा service वर काय परिणाम होतो?'],
    value: ['Would clearer billing and outlet visibility improve daily control?', 'Clear billing और outlet visibility से daily control बेहतर होगा?', 'Clear billing आणि outlet visibility मुळे daily control सुधारेल का?'],
  },
  'Citelflow.ai': {
    situation: ['Which customer follow-up tasks does your team handle manually?', 'Team कौन-से customer follow-ups manually करती है?', 'Team कोणते customer follow-ups manually करते?'],
    problem: ['Which follow-ups are most likely to be delayed or missed?', 'कौन-से follow-ups delay या miss होते हैं?', 'कोणते follow-ups delay किंवा miss होतात?'],
    implication: ['What happens to sales when those follow-ups are missed?', 'Follow-up miss होने से sales पर क्या असर पड़ता है?', 'Follow-up miss झाल्यामुळे sales वर काय परिणाम होतो?'],
    value: ['Would a more consistent follow-up process help your team convert better?', 'Consistent follow-up process से team को फायदा होगा?', 'Consistent follow-up process मुळे team ला फायदा होईल का?'],
  },
}

const GENERIC = {
  situation: ['How are you handling this today?', 'अभी यह काम कैसे manage करते हैं?', 'सध्या हे काम कसं manage करता?'],
  problem: ['What is the biggest difficulty in the current process?', 'Current process में सबसे बड़ी problem क्या है?', 'सध्याच्या process मध्ये सर्वात मोठी अडचण कोणती?'],
  implication: ['What impact does that have on time, cost, or customers?', 'उसका time, cost या customers पर क्या असर पड़ता है?', 'त्याचा time, cost किंवा customers वर काय परिणाम होतो?'],
  value: ['If that issue were solved, what would improve first?', 'यह issue solve हो तो सबसे पहले क्या improve होगा?', 'ही अडचण सुटली तर सर्वात आधी काय सुधारेल?'],
}

function normalize(value = '') { return String(value).replace(/\s+/g, ' ').trim() }
function indexForLanguage(language) { return language === 'Hindi' ? 1 : language === 'Marathi' ? 2 : 0 }
function pretty(value) { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function detectResponseLanguage(text, requested, fallback) {
  if (['Marathi', 'Hindi', 'English'].includes(requested)) return requested
  if (/(?:आहे|नाही|सध्या|किती|करता|झाल|aahe|jasta|garaj|vichar|nantar|kasa|kiti)/i.test(text)) return 'Marathi'
  if (/(?:है|नहीं|अभी|कितने|करना|पड़ेगा|hai|abhi|kitne|karna|sakte|padega|kaise)/i.test(text)) return 'Hindi'
  return fallback || 'English'
}

function detectBuyingSignal(text) {
  if (BUYING_SIGNALS.strong.some((pattern) => pattern.test(text))) return 'Strong'
  if (BUYING_SIGNALS.medium.some((pattern) => pattern.test(text))) return 'Medium'
  if (BUYING_SIGNALS.weak.some((pattern) => pattern.test(text))) return 'Weak'
  return 'None'
}

function detectStage(text, objectionType, buyingSignal, lead) {
  if (buyingSignal === 'Strong') return 'CLOSING'
  if (buyingSignal !== 'None') return 'BUYING_SIGNAL'
  if (DISCOUNT.test(text) || lead.pipelineStage === 'Negotiation') return 'NEGOTIATION'
  if (objectionType && objectionType !== 'GENERAL') return 'OBJECTION'
  if (CLOSE.test(text)) return 'CLOSING'
  if (VALUE.test(text)) return 'VALUE_BUILDING'
  if (PROBLEM.test(text)) return 'PROBLEM_FOUND'
  if (CURRENT_PROCESS.test(text) || text.length > 18) return 'DISCOVERY'
  return 'OPENING'
}

function questionStep(stage) {
  if (stage === 'PROBLEM_FOUND') return 'implication'
  if (stage === 'VALUE_BUILDING') return 'value'
  if (stage === 'DISCOVERY') return 'problem'
  return 'situation'
}

function closingQuestion(language, product) {
  if (language === 'Marathi') return `${product || 'हे solution'} सुरू करण्यासाठी पुढची योग्य step ठरवूया का?`
  if (language === 'Hindi') return `${product || 'यह solution'} शुरू करने के लिए अगला सही step तय करें?`
  return `Shall we agree on the next step to start ${product || 'this solution'}?`
}

function rootCauseQuestion(language) {
  if (language === 'Marathi') return 'मुख्य concern नेमका price, usefulness की timing बद्दल आहे?'
  if (language === 'Hindi') return 'Main concern price, usefulness या timing में से किस बारे में है?'
  return 'Is the main concern price, usefulness, or timing?'
}

export function analyzeSalesBrain(statement, options = {}) {
  const text = normalize(statement)
  const lead = options.lead || {}
  const objection = options.objection || { objectionType: 'GENERAL', responseLanguage: 'English' }
  const language = detectResponseLanguage(text, options.responseLanguage, objection.responseLanguage)
  const product = getProducts(lead)[0] || ''
  const buyingSignal = detectBuyingSignal(text)
  const decisionMaker = DECISION_MAKER.test(text) || ['OWNER_UNAVAILABLE', 'PARTNER_APPROVAL'].includes(objection.objectionType) ? 'Not Reached' : 'Unknown'
  const stage = detectStage(text, objection.objectionType, buyingSignal, lead)
  const rootCause = ROOT_CAUSES[objection.objectionType] || (objection.objectionType === 'THINK_ABOUT_IT' ? 'UNCLEAR' : 'NONE')
  const productQuestions = PRODUCT_QUESTIONS[product] || GENERIC
  const step = questionStep(stage)
  let technique = `${pretty(step)} / SPIN`
  let bestMove = 'Ask a question'
  let askNext = productQuestions[step][indexForLanguage(language)]
  let why = stage === 'DISCOVERY' ? 'Find the real operational problem before presenting value.' : 'Move the conversation forward with one relevant question.'
  let avoid = 'Do not overload the customer with features.'
  let nextAction = 'Continue discovery'
  let warning = ''

  if (rootCause === 'UNCLEAR') {
    technique = 'Objection clarification'
    askNext = rootCauseQuestion(language)
    why = 'Reveal the real objection before responding.'
    avoid = 'Do not answer an objection you have not identified.'
    nextAction = 'Clarify the root cause'
    warning = 'Clarify the real objection first'
  } else if (decisionMaker === 'Not Reached') {
    technique = 'Decision process discovery'
    askNext = objection.nextQuestion
    why = 'Understand who decides and secure a useful next conversation.'
    avoid = 'Do not keep pitching without the decision-maker.'
    nextAction = 'Reach the decision-maker'
    warning = 'Decision maker not identified'
  } else if (buyingSignal === 'Strong') {
    technique = 'Commitment close'
    bestMove = 'Move to the next commitment'
    askNext = closingQuestion(language, product)
    why = 'The customer is asking implementation or purchase questions.'
    avoid = 'Stop over-explaining and do not restart the full pitch.'
    nextAction = 'Confirm the next step'
    warning = 'Customer gave a buying signal — move forward'
  } else if (stage === 'OBJECTION') {
    technique = 'Root-cause clarification'
    askNext = objection.nextQuestion
    why = `Check whether the real issue is ${rootCause === 'NONE' ? 'need, value, timing, or authority' : rootCause.toLowerCase()}.`
    avoid = objection.avoid
    nextAction = objection.recommendedAction
    warning = objection.objectionType === 'PRICE' || DISCOUNT.test(text) ? "Don't discount yet" : 'Ask a question instead of continuing the pitch'
  } else if (DISCOUNT.test(text)) {
    warning = "Don't discount yet"
  } else if (stage === 'OPENING') {
    warning = 'Discover the problem before pitching'
  }

  return {
    stage,
    customerSignal: buyingSignal !== 'None' ? `${buyingSignal} buying signal` : objection.title || 'Needs discovery',
    buyingSignal,
    decisionMaker,
    rootCause,
    technique,
    bestMove,
    askNext,
    why,
    avoid,
    nextAction,
    warning,
    product: product || 'General',
    responseLanguage: language,
  }
}

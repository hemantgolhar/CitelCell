import { getProducts } from '../utils/pipeline.js'
import { normalizeSalesConversation } from './salesLanguageNormalizer.js'

export const CONVERSATION_STAGES = ['OPENING', 'DISCOVERY', 'PROBLEM_FOUND', 'VALUE_BUILDING', 'OBJECTION', 'BUYING_SIGNAL', 'NEGOTIATION', 'CLOSING']

const BUYING_SIGNALS = {
  strong: [/(?:how do (?:i|we) (?:start|pay|order)|how can we start|payment.*(?:how|kaise|कसे|कैसे)|(?:upi|qr).*(?:bhejo|send|pathva|पाठवा)|(?:tomorrow|उद्या|कल|kal).*(?:install|setup|start)|(?:install|setup|start).*(?:tomorrow|उद्या|कल|kal)|start (?:karte|karuya|करूया|करते)|place (?:the )?order|order (?:kaise|kasa|कसा)|\b\d+\s*(?:cards?|कार्ड).*(?:chahiye|पाहिजे|हवे)|ready to (?:start|buy)|invoice|agreement)/i],
  medium: [/(?:setup|install|delivery).*(?:how long|when|time|kitne din|किती वेळ|कितने दिन)|(?:kitne din|किती वेळ|कितने दिन).*(?:setup|install|delivery)|can we customize|customi[sz]|metal card.*(?:available|hai|आहे)|available.*metal card|what.*next step|next step.*(?:kya|काय|what)/i],
  weak: [/(?:demo|details|brochure|example|sample|features?|plan|package).*(?:send|show|share|dikh|पाठव|दाखव)/i],
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
function detectResponseLanguage(text, requested, fallback) {
  if (['Marathi', 'Hindi', 'English'].includes(requested)) return requested
  if (/(?:आहे|नाही|सध्या|किती|करता|झाल|उद्या|aahe|jasta|garaj|vichar|nantar|kasa|kiti|sobat|karto|kartey|pathva|var|shakta)/i.test(text)) return 'Marathi'
  if (/(?:है|नहीं|अभी|कितने|करना|पड़ेगा|hai|abhi|kitne|kitna|karna|sakte|padega|kaise|dogo|doge)/i.test(text)) return 'Hindi'
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

function spinTechnique(step) {
  if (step === 'problem') return 'SPIN Problem Question'
  if (step === 'implication') return 'SPIN Implication Question'
  if (step === 'value') return 'Need-Payoff Question'
  return 'SPIN Situation Question'
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

function phrase(language, english, hindi, marathi) {
  return language === 'Marathi' ? marathi : language === 'Hindi' ? hindi : english
}

function productValue(product, language) {
  const values = {
    'Smart Menu': ['menu updates', 'menu updates', 'menu updates'],
    'Google Review Card': ['the review process', 'review process', 'review process'],
    'Aura Smart Business Card': ['sharing your details', 'details share करना', 'details share करणं'],
    'Citeltech POS': ['billing operations', 'billing process', 'billing process'],
    'Citelflow.ai': ['follow-up consistency', 'follow-up consistency', 'follow-up consistency'],
  }
  return (values[product] || ['this process', 'इस process', 'या process'])[indexForLanguage(language)]
}

function commitmentQuestion(language, product) {
  return phrase(language,
    `If the value of ${product || 'this solution'} is clear, would you be comfortable moving forward today?`,
    `अगर ${product || 'इस solution'} की value clear हो जाए, तो आज आगे बढ़ना comfortable रहेगा?`,
    `${product || 'या solution'} ची value clear झाली तर आज पुढे जायला comfortable असाल का?`)
}

export function analyzeSalesBrain(statement, options = {}) {
  const normalizedConversation = normalizeSalesConversation(statement)
  const text = normalize(normalizedConversation.normalized)
  const lead = options.lead || {}
  const objection = options.objection || { objectionType: 'GENERAL', responseLanguage: 'English' }
  const language = detectResponseLanguage(text, options.responseLanguage, objection.responseLanguage)
  const product = getProducts(lead)[0] || ''
  const semanticIntents = Array.isArray(options.semanticIntents) ? options.semanticIntents : []
  const semanticTop = semanticIntents[0] || { intent: 'GENERAL', confidence: 0 }
  const recentTurns = Array.isArray(options.context?.recentTurns) ? options.context.recentTurns.slice(-12) : []
  const previousTurn = recentTurns.length > 1 ? recentTurns.at(-2) : null
  const previousObjection = previousTurn?.objection || 'GENERAL'
  let buyingSignal = detectBuyingSignal(text)
  if (buyingSignal === 'None' && semanticTop.confidence >= 0.5 && ['IMPLEMENTATION', 'CUSTOMIZATION'].includes(semanticTop.intent)) buyingSignal = 'Medium'
  if (buyingSignal === 'None' && semanticTop.confidence >= 0.5 && semanticTop.intent === 'PAYMENT') buyingSignal = 'Strong'
  const decisionMaker = DECISION_MAKER.test(text)
    || ['OWNER_UNAVAILABLE', 'PARTNER_APPROVAL'].includes(objection.objectionType)
    || ['DECISION_AUTHORITY', 'PARTNER_APPROVAL', 'OWNER_UNAVAILABLE'].includes(semanticTop.intent) ? 'Not Reached' : 'Unknown'
  let stage = detectStage(text, objection.objectionType, buyingSignal, lead)
  const rootCause = ROOT_CAUSES[objection.objectionType] || (objection.objectionType === 'THINK_ABOUT_IT' ? 'UNCLEAR' : 'NONE')
  const productQuestions = PRODUCT_QUESTIONS[product] || GENERIC
  const step = questionStep(stage)
  let technique = spinTechnique(step)
  let bestMove = 'Ask a question'
  let askNext = productQuestions[step][indexForLanguage(language)]
  let why = stage === 'DISCOVERY' ? 'Find the real operational problem before presenting value.' : 'Move the conversation forward with one relevant question.'
  let avoid = 'Do not overload the customer with features.'
  let nextAction = 'Continue discovery'
  let warning = ''
  let punchLine = phrase(language,
    `Let’s first understand what would improve ${productValue(product, language)} for you.`,
    `पहले समझते हैं कि ${productValue(product, language)} में आपके लिए क्या improve होना चाहिए।`,
    `आधी समजून घेऊया की ${productValue(product, language)} मध्ये तुमच्यासाठी काय improve व्हायला हवं.`)
  let closingMove = 'Identify one meaningful problem.'

  if (rootCause === 'UNCLEAR') {
    technique = 'Objection clarification'
    askNext = rootCauseQuestion(language)
    why = 'Reveal the real objection before responding.'
    avoid = 'Do not answer an objection you have not identified.'
    nextAction = 'Clarify the root cause'
    warning = 'Clarify the real objection first'
    punchLine = rootCauseQuestion(language)
    closingMove = 'Identify the real concern without pressuring the customer.'
  } else if (decisionMaker === 'Not Reached') {
    stage = 'OBJECTION'
    technique = 'Decision process discovery'
    askNext = phrase(language,
      'What specific time would be suitable for a short conversation with the decision-maker?',
      'Decision-maker से short conversation के लिए कौन-सा specific time सही रहेगा?',
      'Decision-maker सोबत short conversation साठी कोणती specific वेळ योग्य राहील?')
    why = 'Understand who decides and secure a useful next conversation.'
    avoid = 'Do not keep pitching without the decision-maker.'
    nextAction = 'Reach the decision-maker'
    warning = 'Decision maker not identified'
    punchLine = phrase(language,
      'When is the decision-maker usually available? I can give them a five-minute overview.',
      'Decision-maker usually कब available रहते हैं? मैं उन्हें five-minute overview दे दूँगा।',
      'Decision-maker usually कधी available असतात? मी त्यांना five-minute overview देतो.')
    closingMove = 'Get a specific time with the decision-maker.'
  } else if (buyingSignal === 'Strong') {
    technique = 'Commitment close'
    bestMove = 'Move to the next commitment'
    askNext = closingQuestion(language, product)
    why = 'The customer is asking implementation or purchase questions.'
    avoid = 'Stop over-explaining and do not restart the full pitch.'
    nextAction = 'Confirm the next step'
    warning = 'Customer gave a buying signal — move forward'
    punchLine = phrase(language,
      `Absolutely — shall we confirm the next step for ${product || 'this solution'}?`,
      `बिल्कुल — ${product || 'इस solution'} का next step confirm कर दें?`,
      `नक्की — ${product || 'या solution'} ची next step confirm करूया का?`)
    closingMove = 'Ask for confirmation.'
    technique = /(?:tomorrow|उद्या|कल|kal).*(?:setup|install)|(?:setup|install).*(?:tomorrow|उद्या|कल|kal)/i.test(text) ? 'Assumptive Next-Step Close' : 'Commitment Close'
  } else if (buyingSignal !== 'None') {
    technique = 'Trial Close'
    punchLine = objection.objectionType === 'SEND_DETAILS' ? phrase(language,
      `Sure. Which part of ${product || 'the solution'} should I send first?`,
      `ज़रूर। ${product || 'solution'} का कौन-सा part पहले भेजूँ?`,
      `नक्की. ${product || 'solution'} मधला कोणता part आधी पाठवू?`) : phrase(language,
      `It sounds relevant—shall we focus on the part of ${product || 'the solution'} that matters most to you?`,
      `यह relevant लग रहा है—${product || 'solution'} का सबसे important part पहले देखें?`,
      `हे relevant वाटतंय—${product || 'solution'} मधला सर्वात महत्त्वाचा भाग आधी पाहूया का?`)
    askNext = objection.objectionType === 'SEND_DETAILS' ? phrase(language,
      'After you review it, when should I follow up?',
      'Details देखने के बाद मैं कब follow up करूँ?',
      'Details पाहिल्यावर मी कधी follow up करू?') : askNext
    closingMove = objection.objectionType === 'SEND_DETAILS' ? 'Agree on what to send and a specific follow-up time.' : 'Seek permission for the next concrete step.'
  } else if (stage === 'OBJECTION') {
    technique = 'Root-cause clarification'
    askNext = objection.nextQuestion
    why = `Check whether the real issue is ${rootCause === 'NONE' ? 'need, value, timing, or authority' : rootCause.toLowerCase()}.`
    avoid = objection.avoid
    nextAction = objection.recommendedAction
    warning = objection.objectionType === 'PRICE' || DISCOUNT.test(text) ? "Don't discount yet" : 'Ask a question instead of continuing the pitch'
    punchLine = objection.suggestedResponse
    closingMove = 'Confirm the real barrier before presenting value.'
    if (objection.objectionType === 'PRICE') {
      technique = 'Objection Isolation'
      punchLine = phrase(language,
        `Apart from price, is there any other concern about ${product || 'the solution'}?`,
        `Price के अलावा ${product || 'solution'} को लेकर कोई और concern है?`,
        `Price सोडला तर ${product || 'product'} मध्ये अजून काही concern आहे का?`)
      askNext = commitmentQuestion(language, product)
      closingMove = 'Confirm whether price is the only barrier.'
    } else if (objection.objectionType === 'NO_BUDGET') {
      technique = 'Objection Isolation / Value Reframe'
    } else if (objection.objectionType === 'NO_NEED') {
      technique = 'Challenger-style Insight'
    } else if (objection.objectionType === 'TRUST') {
      technique = 'Ethical Social Proof suggestion'
      closingMove = 'Offer only a genuine, relevant reference or verifiable demonstration.'
    } else if (objection.objectionType === 'CALL_LATER') {
      technique = 'Alternative Choice Close'
      closingMove = 'Offer two specific callback windows.'
    }
  } else if (DISCOUNT.test(text)) {
    warning = "Don't discount yet"
    technique = 'Discount Defense'
    punchLine = phrase(language,
      'If we finalize the price, are you ready to proceed today?',
      'Price finalize हो गया तो आज proceed करने का decision है?',
      'Price finalize झाला तर आज proceed करायचा decision आहे का?')
    askNext = commitmentQuestion(language, product)
    closingMove = 'Confirm purchase intent before negotiating.'
  } else if (stage === 'OPENING') {
    warning = 'Discover the problem before pitching'
  }

  if (normalizedConversation.concepts.includes('COMPETITOR') && buyingSignal !== 'Strong') {
    technique = 'Competitive Reframe'
    punchLine = phrase(language,
      'That makes sense—what would you most like the current system to do better?',
      'ठीक है—current system में सबसे जरूरी improvement क्या चाहिए?',
      'ठीक आहे—current system मध्ये सर्वात महत्त्वाची सुधारणा कोणती हवी?')
    askNext = productQuestions.problem[indexForLanguage(language)]
    closingMove = 'Agree on the gap the current option does not solve.'
    why = 'Compare against the customer’s priorities, not against claims.'
    avoid = 'Do not criticize the competitor or invent comparisons.'
  }

  if (normalizedConversation.concepts.includes('DISCOUNT') && buyingSignal !== 'Strong') {
    technique = 'Discount Defense'
    punchLine = phrase(language,
      'If we finalize the price, are you ready to proceed today?',
      'Price finalize हो गया तो आज proceed करने का decision है?',
      'Price finalize झाला तर आज proceed करायचा decision आहे का?')
    askNext = commitmentQuestion(language, product)
    closingMove = 'Confirm purchase intent before negotiating.'
    warning = "Don't discount yet"
  }

  if (semanticTop.confidence >= 0.34 && buyingSignal !== 'Strong' && decisionMaker !== 'Not Reached') {
    const intent = semanticTop.intent
    if (intent === 'PRICE_VALUE') {
      stage = 'OBJECTION'
      technique = 'Value Reframe'
      punchLine = phrase(language, 'Fair question—let’s check whether the value matches what you need.', 'सही सवाल है—पहले देखते हैं कि value आपकी जरूरत के हिसाब से है या नहीं।', 'योग्य प्रश्न आहे—value तुमच्या गरजेनुसार आहे का ते आधी पाहूया.')
      askNext = phrase(language, 'Which result would make this investment worthwhile for you?', 'कौन-सा result इस investment को worthwhile बनाएगा?', 'कोणता result मिळाला तर ही investment worthwhile वाटेल?')
      closingMove = 'Connect price to the customer’s required outcome.'
      why = 'The concern is value received for the price, not merely the number.'
      avoid = 'Do not defend the price before understanding expected value.'
    } else if (intent === 'ADOPTION_CONCERN') {
      stage = 'OBJECTION'; technique = 'Adoption Reframe'
      punchLine = phrase(language, 'That concern is valid—let’s make the customer step simple first.', 'यह concern valid है—पहले customer का step simple रखते हैं।', 'हा concern योग्य आहे—आधी customer ची step simple ठेवूया.')
      askNext = phrase(language, 'Where do you think customers would hesitate?', 'आपको लगता है customers कहाँ hesitate करेंगे?', 'Customers कुठे hesitate करतील असं तुम्हाला वाटतं?')
      closingMove = 'Agree on a low-friction adoption approach.'
    } else if (intent === 'STATUS_QUO') {
      stage = 'DISCOVERY'; technique = 'Status-Quo Reframe'
      punchLine = phrase(language, 'If the current process works, we should only change what creates a real improvement.', 'Current process ठीक है तो सिर्फ वही बदलेंगे जहाँ real improvement हो।', 'Current process ठीक असेल तर real improvement जिथे आहे तिथेच बदल करूया.')
      askNext = phrase(language, 'What is the one thing you would still improve in the current process?', 'Current process में एक चीज क्या improve करना चाहेंगे?', 'Current process मध्ये एक गोष्ट कोणती improve कराल?')
      closingMove = 'Identify one worthwhile gap before proposing change.'
    } else if (intent === 'USABILITY') {
      stage = 'OBJECTION'; technique = 'Proof/Risk Reduction'
      punchLine = phrase(language, 'Your staff should feel comfortable before you commit.', 'Commit करने से पहले staff का comfortable होना जरूरी है।', 'Commit करण्याआधी staff comfortable असणं महत्त्वाचं आहे.')
      askNext = phrase(language, 'Which part might be difficult for the team?', 'Team को कौन-सा part difficult लग सकता है?', 'Team ला कोणता part difficult वाटू शकतो?')
      closingMove = 'Demonstrate the relevant workflow before seeking commitment.'
    } else if (intent === 'PROOF_TRIAL' || intent === 'TRUST') {
      stage = 'OBJECTION'; technique = 'Proof/Risk Reduction'
      punchLine = phrase(language, 'That is reasonable—you should verify it before deciding.', 'बिल्कुल सही—decision से पहले verify करना चाहिए।', 'बरोबर आहे—decision आधी verify करणं योग्य आहे.')
      askNext = phrase(language, 'What would you need to see in a demo to feel confident?', 'Demo में क्या देखकर confidence आएगा?', 'Demo मध्ये काय पाहिल्यावर confidence येईल?')
      closingMove = 'Agree on a specific, verifiable demonstration.'
    } else if (intent === 'DECISION_AUTHORITY' || intent === 'PARTNER_APPROVAL') {
      stage = 'OBJECTION'; technique = 'Decision-Maker Close'
      punchLine = phrase(language, 'Let’s make the next conversation useful for the person who decides.', 'Decision लेने वाले के लिए next conversation useful रखते हैं।', 'Decision घेणाऱ्या व्यक्तीसाठी next conversation useful ठेवूया.')
      askNext = phrase(language, 'When can we speak with the decision-maker together?', 'Decision-maker से साथ में कब बात कर सकते हैं?', 'Decision-maker सोबत आपण कधी बोलू शकतो?')
      closingMove = 'Secure a specific decision-maker conversation.'
    } else if (intent === 'TIME_EFFORT') {
      stage = 'OBJECTION'; technique = 'Consequence Question'
      askNext = phrase(language, 'Which part currently consumes the most time?', 'अभी कौन-सा part सबसे ज्यादा time लेता है?', 'सध्या कोणता part सर्वात जास्त वेळ घेतो?')
      closingMove = 'Identify whether reduced effort creates enough value.'
    }
  }

  if (decisionMaker === 'Not Reached' && buyingSignal === 'Strong') {
    stage = 'BUYING_SIGNAL'
    technique = 'Decision-Maker Close'
    punchLine = phrase(language, 'Perfect—we can keep setup ready. When can we get the decision-maker’s confirmation?', 'Perfect—setup ready रखते हैं। Decision-maker की confirmation कब ले सकते हैं?', 'Perfect—setup ready ठेवूया. Decision-maker ची confirmation कधी घेऊ शकतो?')
    askNext = phrase(language, 'What exact time can we confirm this together?', 'किस exact time पर हम साथ में confirm कर सकते हैं?', 'कोणत्या exact वेळी आपण हे confirm करू शकतो?')
    closingMove = 'Preserve the buying momentum and secure authority confirmation.'
    warning = 'Buying intent is strong, but approval is still required'
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
    punchLine,
    closingMove,
    detectedIntent: [...new Set([
      semanticTop.confidence >= 0.34 && semanticTop.intent !== 'GENERAL' ? semanticTop.intent : '',
      ...normalizedConversation.concepts,
      objection.objectionType !== 'GENERAL' ? objection.objectionType : '',
      buyingSignal === 'Strong' ? 'BUYING_SIGNAL' : '',
    ].filter(Boolean))].join(' + ') || 'GENERAL',
    product: product || 'General',
    responseLanguage: language,
    semanticIntents,
    semanticConfidence: semanticTop.confidence,
    activeObjection: objection.objectionType,
    objectionChanged: previousObjection !== 'GENERAL' && previousObjection !== objection.objectionType,
    conversationTurnCount: recentTurns.length,
  }
}

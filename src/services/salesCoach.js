import { getProducts } from '../utils/pipeline.js'
import { normalizeSalesConversation } from './salesLanguageNormalizer.js'

export const OBJECTION_TYPES = [
  'PRICE', 'THINK_ABOUT_IT', 'NO_NEED', 'OWNER_UNAVAILABLE', 'CALL_LATER', 'SEND_DETAILS',
  'COMPETITOR', 'PARTNER_APPROVAL', 'NO_BUDGET', 'NO_TIME', 'TRUST', 'NOT_INTERESTED', 'GENERAL',
]

const MATCHERS = {
  PRICE: [/\b(?:price|cost|rate)\b.*(?:high|more|much|jasta|zyada|jada)/i, /(?:expensive|costly|mahag|mahal|महाग|महंगा|महंगी|जास्त|ज्यादा)/i, /price.*(?:aahe|hai|आहे|है)/i],
  THINK_ABOUT_IT: [/(?:think about|think and|need to think|soch ke|sochkar|vichar kar|vichar करून|विचार करून|सोच कर|सोचकर)/i, /(?:मी विचार|main soch|mai soch|sangun|सांगतो|बताऊंगा|बताता)/i],
  NO_NEED: [/(?:no need|no requirement|not required|need nahi|zarurat nahi|garaj nahi|गरज नाही|ज़रूरत नहीं|आत्ता गरज नाही)/i, /(?:currently|abhi|atta|आत्ता|अभी).*(?:need|requirement|garaj|zarurat|गरज|ज़रूरत).*(?:nahi|नाही|नहीं)/i],
  OWNER_UNAVAILABLE: [/(?:owner|malik|मालक|मालिक).*(?:unavailable|not available|available nahi|nahi hai|नाही|नहीं)/i, /(?:owner|malik|मालक|मालिक).*(?:later|baad|nantar|नंतर|बाद)/i],
  CALL_LATER: [/(?:call|phone|बोल|कॉल).*(?:later|baad mein|nantar|नंतर|बाद में)/i, /(?:later|baad mein|nantar|नंतर|बाद में).*(?:call|phone|कॉल)/i, /(?:udya|tomorrow|कल|उद्या).*(?:call|कॉल)/i],
  SEND_DETAILS: [/(?:send|share|pathva|bhejo|भेजो|पाठवा).*(?:detail|info|information|mahiti|माहिती|brochure|whatsapp)/i, /(?:detail|info|mahiti|माहिती).*(?:whatsapp|send|share|pathva|bhejo|भेजो|पाठवा)/i],
  COMPETITOR: [/(?:competitor|other vendor|another vendor|dusra vendor|दूसरा vendor|दुसरा vendor|comparison|compare|तुलना)/i, /(?:already using|use kar rahe|वापरत).*(?:other|dusra|दूसरा|दुसर)/i],
  PARTNER_APPROVAL: [/(?:partner|boss|manager|team|wife|husband|साथीदार|पार्टनर).*(?:approval|approve|discuss|ask|pooch|बोल|विचार)/i, /(?:discuss|approval|approve).*(?:partner|boss|manager|team|wife|husband)/i],
  NO_BUDGET: [/(?:no budget|budget nahi|budget issue|budget problem|budget tight|funds nahi|paise nahi|पैसे नाही|बजट नहीं|बजेट नाही)/i, /(?:afford nahi|cannot afford|can't afford|परवडत नाही)/i],
  NO_TIME: [/(?:no time|time nahi|busy|वेळ नाही|वेळ नाहिये|समय नहीं|abhi time nahi|आत्ता वेळ नाही)/i, /(?:meeting|कामात|kaam mein).*(?:busy|व्यस्त)/i],
  TRUST: [/(?:trust|bharosa|विश्वास|भरोसा|genuine|proof|guarantee|reliable|विश्वसनीय)/i, /(?:kaise maan|कसं मान|कैसे मान)/i],
  NOT_INTERESTED: [/(?:not interested|interested nahi|interest nahi|इंटरेस्ट नहीं|रस नाही|नको आहे|नकोय)/i, /(?:don't want|do not want|नहीं चाहिए|नको)/i],
}

const COACHING = {
  English: {
    PRICE: ['Price objection', 'Apart from the price, is there anything else about {product} that concerns you?', 'How are you currently handling this need?', 'Check whether price is the real objection.', 'Do not offer a discount immediately.', 'Continue discovery'],
    THINK_ABOUT_IT: ['Needs time to think', 'Of course. What specific point would help you decide more confidently?', 'Is there any concern I can clarify before you think it over?', 'Find the unresolved concern.', 'Do not pressure for an instant decision.', 'Clarify one concern'],
    NO_NEED: ['No current need', 'Understood. What are you using today, and when might this become relevant?', 'What would need to change for {product} to become useful?', 'Understand timing and current process.', 'Do not argue with the customer.', 'Explore future timing'],
    OWNER_UNAVAILABLE: ['Owner unavailable', 'No problem. When would be a suitable time to connect with the owner?', 'Who else can help us understand the requirement meanwhile?', 'Secure a clear time or contact.', 'Do not keep pitching to the wrong person.', 'Confirm owner callback'],
    CALL_LATER: ['Call later', 'Certainly. What day and time would be convenient for a short call?', 'Is there one point I should prepare before calling?', 'Get a specific callback window.', 'Do not accept a vague “later”.', 'Agree on a callback time'],
    SEND_DETAILS: ['Send details', 'Sure. Which part of {product} is most relevant so I can send useful details?', 'After you review it, when should I check back?', 'Tailor the information and agree on follow-up.', 'Do not send a generic dump without a next step.', 'Share relevant details'],
    COMPETITOR: ['Competitor comparison', 'That makes sense. Which feature or result matters most in your comparison?', 'What do you like or dislike about the current option?', 'Learn the decision criteria.', 'Do not criticize the competitor.', 'Compare on customer priorities'],
    PARTNER_APPROVAL: ['Partner approval needed', 'Absolutely. What information would help your partner evaluate this?', 'Would a short discussion with both of you be useful?', 'Support the internal decision.', 'Do not bypass the partner.', 'Equip the decision-maker'],
    NO_BUDGET: ['Budget constraint', 'Understood. Is the issue the current timing or the overall investment?', 'What budget range were you planning for this need?', 'Understand budget and timing honestly.', 'Do not force a discount or financing promise.', 'Qualify budget and timing'],
    NO_TIME: ['No time', 'I understand. Can I ask one quick question to see if {product} is worth revisiting?', 'When is your less busy period?', 'Respect time and secure permission to continue.', 'Do not launch into a long pitch.', 'Keep it brief'],
    TRUST: ['Trust concern', 'That is fair. What proof or reassurance would help you evaluate us?', 'Would a demo or relevant reference help?', 'Identify the evidence they need.', 'Do not make exaggerated claims.', 'Offer verifiable proof'],
    NOT_INTERESTED: ['Not interested', 'Understood. May I ask what makes this unsuitable right now?', 'Is it the need, timing, product, or price?', 'Learn without creating pressure.', 'Do not argue or keep pushing.', 'Ask permission for one question'],
    GENERAL: ['Needs clarification', 'Could you tell me a little more about what is holding you back?', 'What matters most to you in this decision?', 'Discover the real concern.', 'Do not assume the objection.', 'Ask one open question'],
  },
  Hindi: {
    PRICE: ['कीमत की आपत्ति', 'Price के अलावा {product} को लेकर कोई और concern है?', 'अभी यह जरूरत आप कैसे manage कर रहे हैं?', 'समझें कि असली concern price ही है या कुछ और।', 'तुरंत discount offer न करें।', 'Discovery जारी रखें'],
    THINK_ABOUT_IT: ['सोचने के लिए समय', 'बिल्कुल। कौन-सी बात clear हो जाए तो decision लेना आसान होगा?', 'सोचने से पहले कोई concern है जिसे मैं clear कर सकता हूँ?', 'असली unresolved concern समझें।', 'तुरंत decision के लिए pressure न डालें।', 'एक concern clear करें'],
    NO_NEED: ['अभी जरूरत नहीं', 'समझ गया। अभी आप यह काम कैसे manage करते हैं?', '{product} कब useful हो सकता है?', 'सही timing और current process समझें।', 'Customer से बहस न करें।', 'Future timing पूछें'],
    OWNER_UNAVAILABLE: ['Owner उपलब्ध नहीं', 'कोई बात नहीं। Owner से बात करने का सही दिन और समय क्या रहेगा?', 'तब तक requirement समझने के लिए किससे बात कर सकता हूँ?', 'एक clear callback time लें।', 'गलत व्यक्ति को pitch करते न रहें।', 'Owner callback तय करें'],
    CALL_LATER: ['बाद में कॉल', 'ज़रूर। Short call के लिए कौन-सा दिन और समय सही रहेगा?', 'Call से पहले मैं कौन-सी जानकारी तैयार रखूँ?', 'Specific callback time लें।', 'सिर्फ “बाद में” पर बात न छोड़ें।', 'Callback time तय करें'],
    SEND_DETAILS: ['Details भेजने हैं', 'ज़रूर। {product} का कौन-सा हिस्सा आपके लिए सबसे relevant है?', 'Details देखने के बाद मैं कब follow up करूँ?', 'Relevant जानकारी भेजकर next step तय करें।', 'बिना follow-up के generic details न भेजें।', 'Relevant details भेजें'],
    COMPETITOR: ['Competitor comparison', 'Comparison में आपके लिए कौन-सा feature या result सबसे important है?', 'Current option में क्या अच्छा है और क्या missing है?', 'Decision criteria समझें।', 'Competitor की बुराई न करें।', 'Priorities पर compare करें'],
    PARTNER_APPROVAL: ['Partner की approval', 'बिल्कुल। आपके partner को decision के लिए कौन-सी जानकारी चाहिए?', 'क्या हम दोनों के साथ एक short discussion रखें?', 'Internal decision को आसान बनाएं।', 'Partner को bypass न करें।', 'Decision-maker को equip करें'],
    NO_BUDGET: ['Budget की समस्या', 'समझ गया। Issue अभी की timing है या total investment?', 'इस जरूरत के लिए आपने कौन-सा budget सोचा था?', 'Budget और timing समझें।', 'Discount का दबाव या झूठा promise न करें।', 'Budget qualify करें'],
    NO_TIME: ['समय नहीं है', 'समझ सकता हूँ। क्या एक छोटा सवाल पूछूँ ताकि पता चले {product} relevant है या नहीं?', 'आपका कम busy समय कब रहता है?', 'समय का सम्मान कर permission लें।', 'लंबी pitch शुरू न करें।', 'बात छोटी रखें'],
    TRUST: ['भरोसे की चिंता', 'यह सही concern है। आपको किस proof या reassurance से confidence मिलेगा?', 'क्या demo या relevant reference मदद करेगा?', 'ज़रूरी evidence समझें।', 'बढ़ा-चढ़ाकर claim न करें।', 'Verifiable proof दें'],
    NOT_INTERESTED: ['Interest नहीं है', 'समझ गया। क्या पूछ सकता हूँ कि अभी यह suitable क्यों नहीं लग रहा?', 'Concern need, timing, product या price में से क्या है?', 'बिना pressure कारण समझें।', 'बहस या लगातार push न करें।', 'एक सवाल की permission लें'],
    GENERAL: ['Concern स्पष्ट नहीं', 'थोड़ा और बताएँ—आपको सबसे ज्यादा कौन-सी बात रोक रही है?', 'इस decision में आपके लिए सबसे important क्या है?', 'असली concern समझें।', 'Objection assume न करें।', 'एक open question पूछें'],
  },
  Marathi: {
    PRICE: ['किंमतीबद्दल आक्षेप', 'Price सोडून {product} बद्दल अजून काही concern आहे का?', 'सध्या ही गरज तुम्ही कशी manage करता?', 'खरा आक्षेप price आहे का ते समजून घ्या.', 'लगेच discount देऊ नका.', 'Discovery सुरू ठेवा'],
    THINK_ABOUT_IT: ['विचार करण्यासाठी वेळ', 'नक्की. कोणती गोष्ट clear झाली तर निर्णय घेणं सोपं होईल?', 'विचार करण्याआधी मी कोणता concern clear करू शकतो?', 'न सुटलेला concern समजून घ्या.', 'लगेच निर्णयासाठी दबाव टाकू नका.', 'एक concern clear करा'],
    NO_NEED: ['सध्या गरज नाही', 'समजलं. सध्या तुम्ही हे काम कसं manage करता?', '{product} कधी उपयोगी ठरू शकतो?', 'योग्य timing आणि सध्याची पद्धत समजून घ्या.', 'Customer सोबत वाद घालू नका.', 'पुढची योग्य वेळ विचारा'],
    OWNER_UNAVAILABLE: ['Owner उपलब्ध नाही', 'ठीक आहे. Owner सोबत बोलण्यासाठी योग्य दिवस आणि वेळ कोणती?', 'तोपर्यंत requirement समजण्यासाठी मी कोणाशी बोलू शकतो?', 'ठराविक callback time मिळवा.', 'चुकीच्या व्यक्तीला pitch करत राहू नका.', 'Owner callback ठरवा'],
    CALL_LATER: ['नंतर कॉल करा', 'नक्की. छोट्या call साठी कोणता दिवस आणि वेळ योग्य राहील?', 'Call आधी मी कोणती माहिती तयार ठेवू?', 'ठराविक callback time मिळवा.', 'फक्त “नंतर” एवढ्यावर थांबू नका.', 'Callback time ठरवा'],
    SEND_DETAILS: ['Details पाठवायचे आहेत', 'नक्की. {product} मधला कोणता भाग तुमच्यासाठी जास्त relevant आहे?', 'Details पाहिल्यावर मी कधी follow up करू?', 'योग्य माहिती पाठवून next step ठरवा.', 'Follow-up शिवाय generic details पाठवू नका.', 'Relevant details पाठवा'],
    COMPETITOR: ['Competitor comparison', 'Comparison करताना कोणता feature किंवा result सर्वात महत्त्वाचा आहे?', 'सध्याच्या option मध्ये काय चांगलं आणि काय कमी आहे?', 'Decision criteria समजून घ्या.', 'Competitor बद्दल वाईट बोलू नका.', 'Customer priorities वर compare करा'],
    PARTNER_APPROVAL: ['Partner ची approval', 'नक्की. तुमच्या partner ला निर्णयासाठी कोणती माहिती हवी आहे?', 'दोघांसोबत short discussion उपयोगी होईल का?', 'Internal decision सोपा करा.', 'Partner ला bypass करू नका.', 'Decision-maker ला माहिती द्या'],
    NO_BUDGET: ['Budget ची अडचण', 'समजलं. अडचण सध्याच्या timing ची आहे की total investment ची?', 'या गरजेसाठी कोणता budget ठरवला होता?', 'Budget आणि timing समजून घ्या.', 'Discount किंवा financing चे चुकीचे promise देऊ नका.', 'Budget qualify करा'],
    NO_TIME: ['वेळ उपलब्ध नाही', 'समजलं. {product} relevant आहे का हे पाहण्यासाठी एक छोटा प्रश्न विचारू?', 'तुमचा कमी busy वेळ कोणता असतो?', 'वेळेचा आदर करून permission घ्या.', 'लांब pitch सुरू करू नका.', 'संवाद छोटा ठेवा'],
    TRUST: ['विश्वासाबद्दल चिंता', 'योग्य concern आहे. कोणता proof किंवा reassurance मिळाल्यास confidence येईल?', 'Demo किंवा relevant reference उपयोगी होईल का?', 'कोणता पुरावा हवा आहे ते समजा.', 'अतिशयोक्तीपूर्ण claims करू नका.', 'तपासता येईल असा proof द्या'],
    NOT_INTERESTED: ['Interest नाही', 'समजलं. सध्या हे योग्य का वाटत नाही ते सांगाल का?', 'Concern need, timing, product की price बद्दल आहे?', 'दबाव न देता कारण समजा.', 'वाद घालू नका किंवा push करू नका.', 'एक प्रश्न विचारण्याची permission घ्या'],
    GENERAL: ['Concern स्पष्ट नाही', 'थोडं अधिक सांगाल का—नेमकी कोणती गोष्ट थांबवत आहे?', 'या decision मध्ये तुमच्यासाठी सर्वात महत्त्वाचं काय आहे?', 'खरा concern शोधा.', 'Objection गृहीत धरू नका.', 'एक open question विचारा'],
  },
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[.,!?;:()[\]"']/g, ' ').replace(/\s+/g, ' ').trim()
}

function detectType(text) {
  let best = { type: 'GENERAL', score: 0 }
  for (const [type, patterns] of Object.entries(MATCHERS)) {
    const score = patterns.reduce((total, pattern) => total + (pattern.test(text) ? 3 : 0), 0)
    if (score > best.score) best = { type, score }
  }
  return best
}

function detectLanguage(text) {
  if (/[ािीुूृेैोौंःळ]/.test(text)) {
    if (/(?:आहे|नाही|आत्ता|गरज|विचार|सांगतो|वेळ|नंतर|ठीक|जास्त|महाग|aahe|nahi|jasta)/i.test(text)) return 'Marathi'
    return 'Hindi'
  }
  if (/(?:aahe|nahiye|jasta|mahag|garaj|vichar|sanga|nantar|atta|udya|baddal)/i.test(text)) return 'Marathi'
  if (/(?:hai|nahi|abhi|soch|karna|padega|bhejo|baad mein|zyada|whatsapp pe)/i.test(text)) return 'Hindi'
  return 'English'
}

function fill(template, product) {
  return template.replaceAll('{product}', product || 'this solution')
}

export function analyzeSalesStatement(statement, options = {}) {
  const normalizedConversation = normalizeSalesConversation(statement)
  const input = normalize(normalizedConversation.normalized)
  const lead = options.lead || {}
  const forcedType = OBJECTION_TYPES.includes(options.objectionType) ? options.objectionType : ''
  let detected = forcedType ? { type: forcedType, score: 9 } : detectType(input)

  if (!forcedType && detected.type === 'GENERAL') {
    const previousContext = normalize(`${lead.followUpOutcome || ''} ${lead.followUpNote || ''} ${lead.notes || ''}`)
    const previous = detectType(previousContext)
    if (previous.type !== 'GENERAL') detected = { type: previous.type, score: 1 }
  }

  const selectedLanguage = ['Marathi', 'Hindi', 'English'].includes(options.responseLanguage)
    ? options.responseLanguage
    : detectLanguage(input)
  const product = getProducts(lead)[0] || ''
  const coaching = COACHING[selectedLanguage][detected.type]
  const confidence = detected.score >= 6 ? 'High' : detected.score >= 3 ? 'Medium' : 'Low'

  return {
    objectionType: detected.type,
    confidence,
    responseLanguage: selectedLanguage,
    title: coaching[0],
    suggestedResponse: fill(coaching[1], product),
    nextQuestion: fill(coaching[2], product),
    goal: coaching[3],
    avoid: coaching[4],
    recommendedAction: coaching[5],
    detectedIntents: normalizedConversation.concepts,
  }
}

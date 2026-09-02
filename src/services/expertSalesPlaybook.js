const INTENTS = [
  'PRICE_VALUE', 'THINK_ABOUT_IT', 'NO_NEED', 'STATUS_QUO', 'OWNER_UNAVAILABLE', 'DECISION_AUTHORITY',
  'PARTNER_APPROVAL', 'SEND_DETAILS', 'CALL_LATER', 'COMPETITOR', 'BUDGET', 'TRUST', 'PROOF_TRIAL',
  'USABILITY', 'ADOPTION_CONCERN', 'TIME_EFFORT', 'IMPLEMENTATION', 'CUSTOMIZATION', 'PAYMENT', 'DISCOUNT', 'NOT_INTERESTED',
]

const PRODUCT_INTELLIGENCE = {
  'Aura Smart Business Card': { process: 'contact sharing', friction: 'paper card हरवणं किंवा details बदलणं', outcome: 'contact details सहज save आणि update करणं' },
  'Google Review Card': { process: 'Google review मागणं', friction: 'staff कडून विचारायचं राहणं किंवा customer review न देता जाणं', outcome: 'genuine review ची step सोपी करणं' },
  'Smart Menu': { process: 'menu updates', friction: 'price किंवा item बदलल्यावर reprint करणं', outcome: 'menu information सहज update करणं' },
  'Citeltech POS': { process: 'billing आणि order flow', friction: 'staff workflow, reporting किंवा visibility ची अडचण', outcome: 'daily billing वर सोपं control ठेवणं' },
  'Citelflow.ai': { process: 'lead follow-up आणि marketing', friction: 'enquiry miss होणं किंवा follow-up inconsistent राहणं', outcome: 'follow-up work consistent ठेवणं' },
  General: { process: 'current process', friction: 'जास्त effort लागणं किंवा काही step miss होणं', outcome: 'एक useful business problem solve करणं' },
}

const PURPOSES = {
  'Objection Isolation': 'Check whether this is the only barrier.', 'Root-Cause Clarification': 'Find the concern beneath the first response.',
  'Status-Quo Reframe': 'Test whether the current process is genuinely good enough.',
  'Value Discovery': 'Learn what outcome the customer values.', 'Value Reframe': 'Connect the decision to a relevant outcome.',
  'Cost-of-Problem': 'Explore the cost of leaving the problem unchanged.', 'Contrast Reframe': 'Compare options using customer priorities.',
  'Consequence Question': 'Explore the practical consequence of the current situation.', 'Decision Criteria': 'Define what a good decision must achieve.',
  'Trial Close': 'Test readiness without pressure.', 'Summary Close': 'Confirm agreed value and the remaining gap.',
  'Commitment Close': 'Ask for one clear next commitment.', 'Assumptive Next-Step': 'Move actionable intent into a practical next step.',
  'Alternative Choice': 'Offer two reasonable next steps.', 'Decision-Maker Close': 'Reach the person needed for approval.',
  'Competitive Reframe': 'Compare against required outcomes without attacking competitors.', 'Proof/Risk Reduction': 'Reduce uncertainty with verifiable evidence.',
  'Adoption Reframe': 'Explore how real users would adopt the solution.', 'Discount Defense': 'Confirm purchase intent before discussing concession.',
  'Budget Qualification': 'Separate affordability, timing, and value.', 'Graceful Disqualification': 'Respect a genuine lack of fit.',
  'Challenger-style Insight': 'Respectfully test an assumption.', 'SPIN Situation': 'Understand the current process.',
  'SPIN Problem': 'Find friction in the current process.', 'SPIN Implication': 'Understand why that friction matters.',
  'Need-Payoff': 'Let the customer describe useful value.',
}

const LADDERS = {
  PRICE_VALUE: ['Objection Isolation', 'Value Discovery', 'Cost-of-Problem', 'Decision Criteria', 'Contrast Reframe', 'Value Reframe', 'Trial Close', 'Graceful Disqualification'],
  THINK_ABOUT_IT: ['Root-Cause Clarification', 'Objection Isolation', 'Decision Criteria', 'Proof/Risk Reduction', 'Value Reframe', 'Summary Close', 'Alternative Choice', 'Graceful Disqualification'],
  NO_NEED: ['SPIN Situation', 'SPIN Problem', 'Challenger-style Insight', 'SPIN Implication', 'Need-Payoff', 'Decision Criteria', 'Trial Close', 'Graceful Disqualification'],
  STATUS_QUO: ['SPIN Situation', 'Status-Quo Reframe', 'SPIN Problem', 'Consequence Question', 'Cost-of-Problem', 'Need-Payoff', 'Trial Close', 'Graceful Disqualification'],
  OWNER_UNAVAILABLE: ['Decision-Maker Close', 'Alternative Choice', 'SPIN Situation', 'Summary Close', 'Commitment Close', 'Proof/Risk Reduction', 'Decision Criteria', 'Graceful Disqualification'],
  DECISION_AUTHORITY: ['Decision-Maker Close', 'Decision Criteria', 'Summary Close', 'Proof/Risk Reduction', 'Alternative Choice', 'Commitment Close', 'Value Reframe', 'Graceful Disqualification'],
  PARTNER_APPROVAL: ['Decision-Maker Close', 'Decision Criteria', 'Summary Close', 'Proof/Risk Reduction', 'Alternative Choice', 'Commitment Close', 'Value Reframe', 'Graceful Disqualification'],
  SEND_DETAILS: ['Root-Cause Clarification', 'Decision Criteria', 'Summary Close', 'Alternative Choice', 'Trial Close', 'Commitment Close', 'Proof/Risk Reduction', 'Graceful Disqualification'],
  CALL_LATER: ['Alternative Choice', 'Root-Cause Clarification', 'Commitment Close', 'Summary Close', 'Decision Criteria', 'Value Reframe', 'Trial Close', 'Graceful Disqualification'],
  COMPETITOR: ['Competitive Reframe', 'Decision Criteria', 'SPIN Problem', 'Contrast Reframe', 'Proof/Risk Reduction', 'Value Reframe', 'Trial Close', 'Graceful Disqualification'],
  BUDGET: ['Budget Qualification', 'Value Discovery', 'Cost-of-Problem', 'Value Reframe', 'Decision Criteria', 'Trial Close', 'Alternative Choice', 'Graceful Disqualification'],
  TRUST: ['Proof/Risk Reduction', 'Root-Cause Clarification', 'Decision Criteria', 'Summary Close', 'Value Reframe', 'Trial Close', 'Commitment Close', 'Graceful Disqualification'],
  PROOF_TRIAL: ['Proof/Risk Reduction', 'Decision Criteria', 'Trial Close', 'Summary Close', 'Value Reframe', 'Commitment Close', 'Alternative Choice', 'Graceful Disqualification'],
  USABILITY: ['Root-Cause Clarification', 'SPIN Problem', 'Proof/Risk Reduction', 'Adoption Reframe', 'Need-Payoff', 'Trial Close', 'Summary Close', 'Graceful Disqualification'],
  ADOPTION_CONCERN: ['Adoption Reframe', 'Root-Cause Clarification', 'SPIN Problem', 'Consequence Question', 'Proof/Risk Reduction', 'Need-Payoff', 'Trial Close', 'Graceful Disqualification'],
  TIME_EFFORT: ['SPIN Problem', 'Consequence Question', 'Cost-of-Problem', 'Need-Payoff', 'Value Reframe', 'Trial Close', 'Alternative Choice', 'Graceful Disqualification'],
  IMPLEMENTATION: ['Root-Cause Clarification', 'Assumptive Next-Step', 'Alternative Choice', 'Summary Close', 'Proof/Risk Reduction', 'Commitment Close', 'Decision Criteria', 'Graceful Disqualification'],
  CUSTOMIZATION: ['Root-Cause Clarification', 'Decision Criteria', 'Proof/Risk Reduction', 'Contrast Reframe', 'Trial Close', 'Summary Close', 'Commitment Close', 'Graceful Disqualification'],
  PAYMENT: ['Root-Cause Clarification', 'Summary Close', 'Alternative Choice', 'Commitment Close', 'Assumptive Next-Step', 'Decision Criteria', 'Proof/Risk Reduction', 'Graceful Disqualification'],
  DISCOUNT: ['Discount Defense', 'Objection Isolation', 'Value Discovery', 'Decision Criteria', 'Value Reframe', 'Trial Close', 'Alternative Choice', 'Graceful Disqualification'],
  NOT_INTERESTED: ['Root-Cause Clarification', 'Objection Isolation', 'SPIN Problem', 'Decision Criteria', 'Value Reframe', 'Trial Close', 'Alternative Choice', 'Graceful Disqualification'],
}

function makeStrategies(intent) {
  return LADDERS[intent].map((technique, index) => ({
    intent, technique, purpose: PURPOSES[technique],
    whenToUse: index === 0 ? 'First clear expression of this concern.' : `After ${index} earlier exploration step${index === 1 ? '' : 's'}.`,
    whenNotToUse: technique === 'Graceful Disqualification' ? 'When the customer is still actively exploring.' : 'When the customer has clearly declined further discussion.',
    tone: 'conversational', aggressiveness: technique.includes('Close') ? 2 : 1,
  }))
}

export const EXPERT_SALES_PLAYBOOK = Object.fromEntries(INTENTS.map((intent) => [intent, makeStrategies(intent)]))

function mixedLines(intent, step, product) {
  const { process, friction, outcome } = PRODUCT_INTELLIGENCE[product] || PRODUCT_INTELLIGENCE.General
  const lines = {
    PRICE_VALUE: [
      [`Fair point. Price बाजूला ठेवला तर बाकी solution बद्दल काही concern आहे का?`, `Value clear झाली तर price हा एकटाच concern राहील का?`, 'Confirm whether price is the only barrier.'],
      [`समजलं. जास्त वाटण्याचं main reason काय—use कमी वाटतोय की return clear नाही?`, `तुमच्यासाठी हा पैसा worth ठरायला नेमकं काय मिळालं पाहिजे?`, 'Define the value the customer expects.'],
      [`एक विचारू? आज ${process} मध्ये ${friction} मुळे काय cost किंवा effort जातो?`, `हा current effort तसाच राहिला तर काय impact होईल?`, 'Quantify the cost of the current problem.'],
      [`Fair. तुमच्या decision चे top two criteria कोणते आहेत?`, `Price व्यतिरिक्त कोणता result must-have आहे?`, 'Agree on clear decision criteria.'],
      [`₹ figure आणि actual use वेगळे पाहूया—${outcome} तुमच्यासाठी किती relevant आहे?`, `Current option आणि हा option compare करताना काय महत्त्वाचं आहे?`, 'Compare using the customer’s priorities.'],
      [`जर ${outcome} solve होत असेल, तर price कडे पाहण्याची picture बदलते का?`, `Value कुठे कमी वाटते ते सांगाल?`, 'Reframe price around a relevant outcome.'],
      [`जर value price justify करत असेल, तर पुढे जायला comfortable आहात का?`, `बाकी काही blocker आहे का?`, 'Test commitment without offering a discount.'],
      [`समजलं. हा budget fit नसेल तर force करू नका—योग्य range काय आहे?`, `हा timing issue आहे की solution fit नाही?`, 'Qualify or disengage respectfully.'],
    ],
    THINK_ABOUT_IT: [
      [`नक्की. Mainly price, timing की usefulness—कशावर विचार करायचा आहे?`, `कोणती एक गोष्ट clear झाली तर decision सोपा होईल?`, 'Reveal the real concern.'],
      [`Sure. विचार करण्याआधी एकच check—बाकी solution ठीक वाटतोय का?`, `Specific concern कोणता आहे?`, 'Isolate the unresolved objection.'],
      [`Decision घेताना तुमच्यासाठी सर्वात important criteria काय आहे?`, `त्यात अजून कोणती माहिती missing आहे?`, 'Clarify decision criteria.'],
      [`मी pressure देणार नाही. Confidence यायला demo, proof की details—काय useful राहील?`, `काय verify करायचं आहे?`, 'Offer verifiable evidence.'],
      [`जर ${outcome} useful वाटत असेल, तर hesitation नेमकी कुठे आहे?`, `Value clear आहे की अजून explore करू?`, 'Connect hesitation to value.'],
      [`आपण need आणि use clear केलं; आता उरलेला एक concern कोणता?`, `तो clear झाला तर next step काय ठेवू?`, 'Summarize and identify the gap.'],
      [`ठीक आहे—उद्या बोलू की next week?`, `कोणती specific वेळ सोयीची?`, 'Agree on a concrete follow-up.'],
      [`No problem. सध्या fit नसेल तर इथेच थांबू; future मध्ये काय बदललं तर relevant होईल?`, `पुन्हा कधी बोलणं meaningful राहील?`, 'Disengage without pressure.'],
    ],
  }
  if (lines[intent]) return lines[intent][step]

  const firstMoves = {
    ADOPTION_CONCERN: [`Customers use करतील का हा valid concern आहे. आधी friction नेमकं कुठे आहे ते पाहूया.`, `Customers ना scan किंवा review करताना कोणती step कठीण वाटेल?`, 'Identify and reduce the real adoption friction.'],
    STATUS_QUO: [`Current setup चालतोय हे चांगलं आहे. बदल फक्त clear improvement असेल तरच योग्य आहे.`, `आजच्या process मध्ये एक गोष्ट improve करायची झाली तर कोणती?`, 'Find one meaningful reason to change—or confirm there is none.'],
    USABILITY: [`Exactly “difficult” कुठे वाटतंय—learning मध्ये की रोजच्या use मध्ये?`, `Staff चा कोणता task सर्वात सोपा ठेवायला हवा?`, 'Locate the usability risk before demonstrating it.'],
    DECISION_AUTHORITY: [`Fair. Decision घेणाऱ्या व्यक्तीला useful होईल अशीच short discussion ठेवूया.`, `त्यांच्यासोबत पाच मिनिटं बोलण्यासाठी कोणती वेळ योग्य आहे?`, 'Get a specific conversation with the decision-maker.'],
    PARTNER_APPROVAL: [`नक्की. Partner ला decision घ्यायला कोणती information लागेल ते prepare करूया.`, `दोघांसोबत short discussion कधी ठेवू?`, 'Include the partner in a specific next conversation.'],
    SEND_DETAILS: [`नक्की पाठवतो. Generic details नको—तुमच्यासाठी relevant part आधी पाठवतो.`, `Details मध्ये price, demo की use-case—काय आधी पाहायचं आहे?`, 'Agree on relevant information and a follow-up time.'],
    CALL_LATER: [`No problem. आत्ता वेळ नसेल तर short call साठी exact slot ठरवूया.`, `आज संध्याकाळी की उद्या—काय convenient आहे?`, 'Secure one specific callback window.'],
    TIME_EFFORT: [`समजलं. तुमचा वेळ respect करूया आणि फक्त relevant point वर बोलूया.`, `एक minute मध्ये need check करू, चालेल?`, 'Get permission for a brief relevance check.'],
    COMPETITOR: [`दुसरा option असणं fair आहे. Compare तुमच्या priorities वर करूया.`, `Current option मध्ये काय चांगलं आहे आणि काय missing आहे?`, 'Define the comparison criteria without attacking competitors.'],
    BUDGET: [`Budget concern समजला. Timing issue आहे की total amount fit होत नाही?`, `Comfortable range काय आहे?`, 'Qualify budget before discussing alternatives.'],
    TRUST: [`Fair concern. Claim मानू नका—जे verify करता येईल तेच पाहूया.`, `Confidence यायला कोणता proof हवा आहे?`, 'Agree on verifiable evidence.'],
    PROOF_TRIAL: [`बरोबर. Decision आधी demo मध्ये actual use verify करूया.`, `Demo मध्ये काय पाहिल्यावर confidence येईल?`, 'Agree on a focused demonstration and decision point.'],
    IMPLEMENTATION: [`Setup बद्दल clarity घेऊया—तुमच्यासाठी timing आणि readiness दोन्ही महत्त्वाचे आहेत.`, `कोणत्या date पर्यंत setup हवा आहे?`, 'Define the required implementation window.'],
    CUSTOMIZATION: [`Custom हवं असेल तर first must-have change clear करूया.`, `Logo, content की workflow—काय बदलणं essential आहे?`, 'Confirm the must-have customization before commitment.'],
    PAYMENT: [`Payment ready असेल तर बाकी terms एकदा clear करून पुढे जाऊया.`, `UPI, card की bank transfer—काय convenient आहे?`, 'Confirm payment method and the immediate next step.'],
    DISCOUNT: [`Price adjust करण्याआधी एक check—figure जमला तर आज confirm करणार आहात का?`, `Price शिवाय दुसरा blocker आहे का?`, 'Confirm purchase intent before negotiating.'],
    NOT_INTERESTED: [`समजलं, push करणार नाही. Fit नाही असं का वाटतं ते एकदा समजून घेऊ?`, `Need, timing की product—मुख्य कारण कोणतं?`, 'Understand the reason or disengage respectfully.'],
  }
  if (step === 0 && firstMoves[intent]) return firstMoves[intent]
  if (intent === 'IMPLEMENTATION' && step === 1) return [`Perfect—setup पुढे न्यायचा असेल तर date confirm करूया.`, `Tomorrow साठी कोणती वेळ योग्य आहे?`, 'Confirm the setup date and owner.']

  const concern = {
    ADOPTION_CONCERN: 'customers खरंच use करतील का', STATUS_QUO: 'current process ठीक चालतोय', USABILITY: 'staff ला difficult वाटेल',
    DECISION_AUTHORITY: 'decision एकट्याने घेता येत नाही', PARTNER_APPROVAL: 'partner ची approval हवी आहे', OWNER_UNAVAILABLE: 'decision-maker available नाही',
    SEND_DETAILS: 'details आधी पाहायचे आहेत', CALL_LATER: 'आत्ता वेळ योग्य नाही', COMPETITOR: 'दुसरा option already आहे',
    BUDGET: 'budget fit होत नाही', TRUST: 'proof हवा आहे', PROOF_TRIAL: 'आधी try करून पाहायचं आहे',
    NO_NEED: 'सध्या need वाटत नाही', TIME_EFFORT: 'time किंवा effort जास्त वाटतोय', IMPLEMENTATION: 'setup बद्दल clarity हवी आहे',
    CUSTOMIZATION: 'customization हवं आहे', PAYMENT: 'payment next step आहे', DISCOUNT: 'discount हवा आहे', NOT_INTERESTED: 'interest नाही',
  }[intent] || 'एक concern आहे'
  const variants = [
    [`समजलं—${concern}. नेमका hesitation कुठे आहे?`, `एक specific example सांगाल?`, 'Clarify the concern.'],
    [`Current ${process} मध्ये आज काय होतं ते आधी समजून घेऊया.`, `सर्वात जास्त friction कुठे येतो?`, 'Understand the current situation.'],
    [`Exactly कोणता part difficult वाटतोय ते पाहूया.`, `Problem learning मध्ये आहे की daily use मध्ये?`, 'Locate the practical problem.'],
    [`जर हे तसंच राहिलं तर practical impact काय होतो?`, `Time, customer की staff—कुठे जास्त परिणाम होतो?`, 'Explore the consequence.'],
    [`Demo मध्ये ${outcome} verify करूया; claim वर विश्वास ठेवायची गरज नाही.`, `काय पाहिल्यावर confidence येईल?`, 'Reduce risk with evidence.'],
    [`जर ${outcome} clear झाला तर हा concern कमी होईल का?`, `त्यासाठी कोणता result पाहिजे?`, 'Let the customer define value.'],
    [`हा point clear झाला तर next step घेऊ शकतो का?`, `बाकी कोणता blocker आहे?`, 'Test readiness.'],
    [`Fit नसेल तर force करायचं नाही. पुढे जाण्यासाठी काय बदलणं गरजेचं आहे?`, `आत्ता stop करणं योग्य आहे का?`, 'Qualify fit respectfully.'],
  ]
  return variants[step]
}

function applyLanguage(line, language) {
  if (language === 'Natural Mixed' || language === 'Auto') return line
  if (language === 'English') return line.replace('समजलं', 'Understood').replace('नक्की', 'Of course')
  if (language === 'Hindi') return line.replace('समजलं', 'समझ गया').replace('नक्की', 'बिल्कुल')
  return line
}

function applyStyle(line, style) {
  if (style === 'Friendly') return `ठीक आहे, no pressure. ${line}`
  if (style === 'Confident') return line.replace(/^(Fair point\.|Fair enough\.|समजलं—?)/, '').trim()
  if (style === 'Challenger') return `एक practical thought—${line}`
  if (style === 'Consultative') return `एकदा नीट समजून घेऊया—${line}`
  return line
}

function turnHasIntent(turn, intent) {
  return turn.intents?.some((candidate) => candidate.intent === intent)
}

export function selectExpertSalesStrategy({ intent, product = 'General', language = 'Natural Mixed', style = 'Balanced', recentTurns = [], buyingSignal = 'None' }) {
  const resolvedIntent = EXPERT_SALES_PLAYBOOK[intent] ? intent : 'NO_NEED'
  const strategies = EXPERT_SALES_PLAYBOOK[resolvedIntent]
  const completedTurns = recentTurns.slice(0, -1)
  const repeatedTurns = completedTurns.filter((turn) => turn.final && turnHasIntent(turn, resolvedIntent))
  const recentlyUsed = new Set(recentTurns.slice(-5).map((turn) => turn.technique).filter(Boolean))
  let index = Math.min(repeatedTurns.length, strategies.length - 1)
  if (recentlyUsed.has(strategies[index].technique) && index < strategies.length - 1) index += 1
  if (buyingSignal === 'Strong' && ['PRICE_VALUE', 'DISCOUNT'].includes(resolvedIntent)) index = resolvedIntent === 'DISCOUNT' ? 0 : Math.max(index, 6)
  if (buyingSignal === 'Strong' && resolvedIntent === 'IMPLEMENTATION') index = Math.max(index, 1)
  if (buyingSignal === 'Strong' && resolvedIntent === 'PAYMENT') index = Math.max(index, 1)
  const strategy = strategies[index]
  const [sayThis, askNext, closingMove] = mixedLines(resolvedIntent, index, product)
  return {
    ...strategy,
    sayThis: applyStyle(applyLanguage(sayThis, language), style),
    askNext: applyLanguage(askNext, language),
    closingMove,
    sequence: index + 1,
    totalStrategies: strategies.length,
  }
}

export function getPlaybookStrategyCounts() {
  return Object.fromEntries(Object.entries(EXPERT_SALES_PLAYBOOK).map(([intent, strategies]) => [intent, strategies.length]))
}

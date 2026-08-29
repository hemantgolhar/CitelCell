import { getProducts } from '../utils/pipeline.js'

const clean = (value) => typeof value === 'string' ? value.trim() : ''

function latestFollowUp(activities = []) {
  return activities
    .filter((activity) => activity?.type === 'follow_up')
    .sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)))[0]
}

function productContext(products) {
  const primary = products[0]

  if (primary === 'Smart Menu') return { subject: 'the Smart Menu', nextStep: 'a quick menu demo' }
  if (primary === 'Google Review Card') return { subject: 'the Google Review Card', nextStep: 'a quick walkthrough of how customers can leave Google reviews' }
  if (primary === 'Citeltech POS') return { subject: 'Citeltech POS', nextStep: 'a quick POS demo' }
  if (primary === 'Citelflow.ai') return { subject: 'Citelflow.ai', nextStep: 'a quick Citelflow.ai demo' }
  if (primary === 'Aura Smart Business Card') return { subject: 'the Aura Smart Business Card', nextStep: 'a quick product demo' }
  if (primary) return { subject: primary, nextStep: `a quick discussion about ${primary}` }

  return { subject: 'our earlier conversation', nextStep: 'a quick discussion' }
}

function selectVariation(options, variation = 0) {
  const index = Math.abs(Number(variation) || 0) % options.length
  return options[index]
}

export function generateFollowUpSuggestion(lead = {}, activities = [], variation = 0) {
  const contactName = clean(lead.contactName)
  const businessName = clean(lead.businessName)
  const greeting = contactName ? `Hi ${contactName}` : 'Hello'
  const businessReference = businessName ? ` for ${businessName}` : ''
  const products = getProducts(lead).map(clean).filter(Boolean)
  const product = productContext(products)
  const latest = latestFollowUp(activities)
  const outcome = clean(latest?.outcome || lead.followUpOutcome)
  const signal = `${outcome} ${clean(latest?.note || lead.followUpNote)} ${clean(lead.notes)}`.toLowerCase()
  const stage = clean(lead.pipelineStage)
  const status = clean(lead.status)

  if (/think about|will think|thinking/.test(signal)) {
    return {
      message: selectVariation([
        `${greeting}, just checking in about ${product.subject}${businessReference}. Please take your time—if any questions have come up, I’ll be happy to help.`,
        `${greeting}, I wanted to gently follow up on ${product.subject}${businessReference}. Whenever convenient, please let me know if you’d like any more details.`,
        `${greeting}, hope you’re doing well. I’m following up on ${product.subject}${businessReference}. No rush—I'm available if you’d like to discuss anything further.`,
      ], variation),
      reason: `The latest follow-up indicates that ${contactName || 'the contact'} wanted time to think, so this keeps the conversation gentle and low-pressure.`,
      tone: 'Gentle',
    }
  }

  if (/owner not available|owner unavailable/.test(signal)) {
    return {
      message: selectVariation([
        `${greeting}, I’m following up about ${product.subject}${businessReference}. Could you please share a suitable time when I may connect with the owner?`,
        `${greeting}, thank you for your time earlier. When would be a convenient time to speak with the owner about ${product.subject}${businessReference}?`,
        `${greeting}, I wanted to reconnect regarding ${product.subject}${businessReference}. Please let me know a suitable time when the owner may be available.`,
      ], variation),
      reason: 'The latest follow-up says the owner was unavailable, so the message asks for a convenient time to reconnect.',
      tone: 'Courteous',
    }
  }

  if (/no need|no requirement|not interested/.test(signal)) {
    return {
      message: selectVariation([
        `${greeting}, I understand that ${product.subject} may not be a priority right now. If your requirements change later, I’ll be glad to help.`,
        `${greeting}, thank you for considering ${product.subject}${businessReference}. I’ll keep this brief—please feel free to reach out whenever the need comes up.`,
        `${greeting}, just leaving the door open regarding ${product.subject}${businessReference}. There’s no pressure, and I’m happy to help if it becomes relevant in the future.`,
      ], variation),
      reason: 'The stored outcome or note indicates no current requirement, so this is a respectful, low-pressure re-engagement.',
      tone: 'Low-pressure',
    }
  }

  const isHot = status === 'Hot' || outcome === 'Interested' || ['Interested', 'Demo / Meeting', 'Proposal', 'Negotiation'].includes(stage)
  if (isHot) {
    return {
      message: selectVariation([
        `${greeting}, I’m following up about ${product.subject}${businessReference}. Would you like to schedule ${product.nextStep} so we can discuss the next steps?`,
        `${greeting}, it was great connecting about ${product.subject}${businessReference}. I’d be happy to arrange ${product.nextStep} at a convenient time—what works for you?`,
        `${greeting}, shall we take the next step with ${product.subject}${businessReference}? I can arrange ${product.nextStep} whenever convenient for you.`,
      ], variation),
      reason: `The lead is marked ${outcome === 'Interested' ? 'Interested' : stage || status}, so the message suggests a clear but friendly next step.`,
      tone: 'Proactive',
    }
  }

  return {
    message: selectVariation([
      `${greeting}, I’m following up regarding ${product.subject}${businessReference}. Please let me know if you’d like any more information or a convenient time to connect.`,
      `${greeting}, hope you’re doing well. I wanted to check in about ${product.subject}${businessReference}. I’m happy to answer any questions when convenient.`,
      `${greeting}, just a friendly follow-up regarding ${product.subject}${businessReference}. Please let me know how I can help with the next step.`,
    ], variation),
    reason: `There is no specific recent objection or strong buying signal, so this uses a friendly general follow-up${products.length ? ` personalized for ${products.join(', ')}` : ''}.`,
    tone: 'Friendly',
  }
}

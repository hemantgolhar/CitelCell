export const PIPELINE_STAGES = ['New Lead', 'Contacted', 'Interested', 'Demo / Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost']
export const OPEN_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => !['Won', 'Lost'].includes(stage))
export const PRODUCT_OPTIONS = ['Citeltech POS', 'Citelflow.ai', 'Smart Menu', 'Aura Smart Business Card', 'Google Review Card']

export function getProducts(lead = {}) {
  if (Array.isArray(lead.productsInterested) && lead.productsInterested.length) return [...new Set(lead.productsInterested.filter(Boolean))]
  return lead.product ? [lead.product] : []
}

export function getProductDeals(lead = {}) {
  const deals = lead.productDeals && typeof lead.productDeals === 'object' ? lead.productDeals : {}
  return Object.fromEntries(getProducts(lead).map((product) => [product, Math.max(0, Number(deals[product]) || 0)]))
}

export function getPotentialValue(lead) {
  return Object.values(getProductDeals(lead)).reduce((total, value) => total + value, 0)
}

export function isWonThisMonth(lead, now = new Date()) {
  if (lead.pipelineStage !== 'Won' || !lead.wonAt) return false
  const won = new Date(lead.wonAt)
  return !Number.isNaN(won.getTime()) && won.getFullYear() === now.getFullYear() && won.getMonth() === now.getMonth()
}

export function getPipelineSummary(leads, now = new Date()) {
  const open = leads.filter((lead) => OPEN_PIPELINE_STAGES.includes(lead.pipelineStage))
  const won = leads.filter((lead) => isWonThisMonth(lead, now))
  const closed = leads.filter((lead) => ['Won', 'Lost'].includes(lead.pipelineStage))
  return {
    openValue: open.reduce((total, lead) => total + getPotentialValue(lead), 0),
    wonThisMonth: won.reduce((total, lead) => total + (Number(lead.finalSaleValue) || 0), 0),
    openCount: open.length,
    conversionRate: closed.length ? Math.round((closed.filter((lead) => lead.pipelineStage === 'Won').length / closed.length) * 100) : 0,
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

export function stageBreakdown(leads) {
  return Object.fromEntries(PIPELINE_STAGES.map((stage) => {
    const items = leads.filter((lead) => lead.pipelineStage === stage)
    const value = items.reduce((total, lead) => total + (stage === 'Won' ? Number(lead.finalSaleValue) || 0 : getPotentialValue(lead)), 0)
    return [stage, { count: items.length, value }]
  }))
}

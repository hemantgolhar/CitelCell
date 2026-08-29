import { openDB } from 'idb'
import { initialLeads } from '../utils/dummyLeads'
import { getProductDeals, getProducts, PIPELINE_STAGES } from '../utils/pipeline'

const DATABASE_NAME = 'personal-sales-crm'
const DATABASE_VERSION = 2
const LEADS_STORE = 'leads'
const ACTIVITIES_STORE = 'activities'
const SETTINGS_STORE = 'settings'
const SEED_KEY = 'initialLeadsSeeded'
const optionalLeadDefaults = {
  secondaryPhone: '',
  email: '',
  website: '',
  address: '',
  category: '',
  designation: '',
}

function normalizeLead(lead) {
  const base = { ...optionalLeadDefaults, ...lead }
  const productsInterested = getProducts(base)
  const pipelineStage = PIPELINE_STAGES.includes(base.pipelineStage) ? base.pipelineStage : base.status === 'Won' ? 'Won' : base.status === 'Lost' ? 'Lost' : 'New Lead'
  return {
    ...base,
    product: base.product || productsInterested[0] || '',
    productsInterested,
    productDeals: getProductDeals({ ...base, productsInterested }),
    pipelineStage,
    soldProducts: Array.isArray(base.soldProducts) ? base.soldProducts : [],
    finalSaleValue: Math.max(0, Number(base.finalSaleValue) || 0),
    wonAt: base.wonAt || '', lostAt: base.lostAt || '', lostReason: base.lostReason || '', lostNote: base.lostNote || '',
  }
}

const database = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const leads = db.createObjectStore(LEADS_STORE, { keyPath: 'id' })
      leads.createIndex('status', 'status')
      leads.createIndex('followUp', 'followUp')
      leads.createIndex('createdAt', 'createdAt')
      db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
    }
    if (oldVersion < 2) {
      const activities = db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' })
      activities.createIndex('leadId', 'leadId')
      activities.createIndex('type', 'type')
      activities.createIndex('createdAt', 'createdAt')
    }
  },
})

export async function initializeLeadData() {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, SETTINGS_STORE], 'readwrite')
  const leadsStore = transaction.objectStore(LEADS_STORE)
  const settingsStore = transaction.objectStore(SETTINGS_STORE)
  const hasSeeded = await settingsStore.get(SEED_KEY)

  if (!hasSeeded) {
    if (await leadsStore.count() === 0) {
      await Promise.all(initialLeads.map((lead) => leadsStore.add(lead)))
    }
    await settingsStore.put({ key: SEED_KEY, value: true })
  }

  await transaction.done
}

export async function getAllLeads() {
  const db = await database
  const leads = await db.getAll(LEADS_STORE)
  return leads.map(normalizeLead).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getLead(id) {
  const db = await database
  const lead = await db.get(LEADS_STORE, id)
  return lead ? normalizeLead(lead) : undefined
}

export async function addLead(lead) {
  const db = await database
  const timestamp = new Date().toISOString()
  const newLead = normalizeLead({
    ...optionalLeadDefaults,
    ...lead,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await db.add(LEADS_STORE, newLead)
  return newLead
}

export async function updateLead(lead) {
  const db = await database
  const updatedLead = normalizeLead({ ...lead, updatedAt: new Date().toISOString() })
  await db.put(LEADS_STORE, updatedLead)
  return updatedLead
}

export async function deleteLead(id) {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const activitiesStore = transaction.objectStore(ACTIVITIES_STORE)
  const activityIds = await activitiesStore.index('leadId').getAllKeys(id)
  await Promise.all(activityIds.map((activityId) => activitiesStore.delete(activityId)))
  await transaction.objectStore(LEADS_STORE).delete(id)
  await transaction.done
}

export async function getAllActivities() {
  const db = await database
  const activities = await db.getAll(ACTIVITIES_STORE)
  return activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getActivitiesByLead(leadId) {
  const db = await database
  const activities = await db.getAllFromIndex(ACTIVITIES_STORE, 'leadId', leadId)
  return activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function completeFollowUp(lead, outcome, note, nextFollowUp = '') {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const timestamp = new Date().toISOString()
  const activity = {
    id: crypto.randomUUID(),
    leadId: lead.id,
    type: 'follow_up',
    outcome,
    note: note.trim(),
    createdAt: timestamp,
  }
  const updatedLead = {
    ...lead,
    followUp: nextFollowUp,
    followUpCompletedAt: timestamp,
    followUpOutcome: outcome,
    followUpNote: note.trim(),
    updatedAt: timestamp,
  }
  await transaction.objectStore(ACTIVITIES_STORE).add(activity)
  await transaction.objectStore(LEADS_STORE).put(updatedLead)
  await transaction.done
  return { activity, lead: updatedLead }
}

export async function rescheduleFollowUp(lead, followUp) {
  const db = await database
  const updatedLead = { ...lead, followUp, updatedAt: new Date().toISOString() }
  await db.put(LEADS_STORE, updatedLead)
  return updatedLead
}

export async function moveLeadStage(lead, pipelineStage) {
  if (!PIPELINE_STAGES.includes(pipelineStage)) throw new Error('Invalid pipeline stage.')
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const timestamp = new Date().toISOString()
  const fromStage = normalizeLead(lead).pipelineStage
  const updatedLead = normalizeLead({ ...lead, pipelineStage, status: pipelineStage === 'Won' ? 'Won' : pipelineStage === 'Lost' ? 'Lost' : lead.status, updatedAt: timestamp })
  const activity = { id: crypto.randomUUID(), leadId: lead.id, type: 'stage_change', outcome: pipelineStage, note: `${fromStage} → ${pipelineStage}`, fromStage, toStage: pipelineStage, createdAt: timestamp }
  await transaction.objectStore(LEADS_STORE).put(updatedLead)
  await transaction.objectStore(ACTIVITIES_STORE).add(activity)
  await transaction.done
  return { lead: updatedLead, activity }
}

export async function markLeadWon(lead, soldProducts, note = '') {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const timestamp = new Date().toISOString()
  const normalizedSold = soldProducts.filter((item) => item.product && Number(item.amount) >= 0).map((item) => ({ product: item.product, amount: Number(item.amount) || 0 }))
  const finalSaleValue = normalizedSold.reduce((total, item) => total + item.amount, 0)
  const updatedLead = normalizeLead({ ...lead, pipelineStage: 'Won', status: 'Won', wonAt: timestamp, soldProducts: normalizedSold, finalSaleValue, saleNote: note.trim(), lostAt: '', lostReason: '', lostNote: '', updatedAt: timestamp })
  const activity = { id: crypto.randomUUID(), leadId: lead.id, type: 'sale_won', outcome: 'Won', note: note.trim(), soldProducts: normalizedSold, finalSaleValue, createdAt: timestamp }
  await transaction.objectStore(LEADS_STORE).put(updatedLead)
  await transaction.objectStore(ACTIVITIES_STORE).add(activity)
  await transaction.done
  return { lead: updatedLead, activity }
}

export async function saveDealClosing(lead, closingDetails) {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const timestamp = new Date().toISOString()
  const isFirstClosing = !lead.closingDetails
  const products = closingDetails.sale.productsPurchased
  const finalSaleValue = Math.max(0, Number(closingDetails.sale.finalPrice) || 0)
  const baseAmount = products.length ? Math.floor(finalSaleValue / products.length) : 0
  const requestedReceived = closingDetails.payment.status === 'Paid'
    ? finalSaleValue
    : closingDetails.payment.status === 'Pending'
      ? 0
      : Number(closingDetails.payment.amountReceived) || 0
  const amountReceived = Math.min(finalSaleValue, Math.max(0, requestedReceived))
  const soldProducts = products.map((product, index) => ({
    product,
    amount: index === 0 ? baseAmount + (finalSaleValue - baseAmount * products.length) : baseAmount,
  }))
  const savedClosingDetails = {
    ...closingDetails,
    sale: { ...closingDetails.sale, finalPrice: finalSaleValue },
    payment: {
      ...closingDetails.payment,
      amountReceived,
      balance: Math.max(0, finalSaleValue - amountReceived),
    },
    createdAt: lead.closingDetails?.createdAt || timestamp,
    updatedAt: timestamp,
  }
  const updatedLead = normalizeLead({
    ...lead,
    businessName: savedClosingDetails.customer.businessName,
    contactName: savedClosingDetails.customer.contactPerson,
    phone: savedClosingDetails.customer.primaryMobile,
    secondaryPhone: savedClosingDetails.customer.secondaryMobile,
    email: savedClosingDetails.customer.email,
    address: savedClosingDetails.customer.address,
    productsInterested: products,
    product: products[0] || '',
    pipelineStage: 'Won',
    status: 'Won',
    wonAt: lead.wonAt || timestamp,
    soldProducts,
    finalSaleValue,
    closingDetails: savedClosingDetails,
    lostAt: '',
    lostReason: '',
    lostNote: '',
    updatedAt: timestamp,
  })
  const activity = isFirstClosing ? {
    id: crypto.randomUUID(),
    leadId: lead.id,
    type: 'sale_closed',
    outcome: 'Sale Closed',
    note: savedClosingDetails.fulfilment.closingNotes,
    createdAt: timestamp,
  } : null

  await transaction.objectStore(LEADS_STORE).put(updatedLead)
  if (activity) await transaction.objectStore(ACTIVITIES_STORE).add(activity)
  await transaction.done
  return { lead: updatedLead, activity }
}

export async function markLeadLost(lead, reason, note = '') {
  if (!reason.trim()) throw new Error('A lost reason is required.')
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const timestamp = new Date().toISOString()
  const updatedLead = normalizeLead({ ...lead, pipelineStage: 'Lost', status: 'Lost', lostAt: timestamp, lostReason: reason.trim(), lostNote: note.trim(), wonAt: '', soldProducts: [], finalSaleValue: 0, updatedAt: timestamp })
  const activity = { id: crypto.randomUUID(), leadId: lead.id, type: 'sale_lost', outcome: reason.trim(), note: note.trim(), createdAt: timestamp }
  await transaction.objectStore(LEADS_STORE).put(updatedLead)
  await transaction.objectStore(ACTIVITIES_STORE).add(activity)
  await transaction.done
  return { lead: updatedLead, activity }
}

export async function mergeCrmData(leads, activities = []) {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const leadsStore = transaction.objectStore(LEADS_STORE)
  const activitiesStore = transaction.objectStore(ACTIVITIES_STORE)
  let leadsImported = 0
  let activitiesImported = 0

  for (const lead of leads) {
    if (!(await leadsStore.get(lead.id))) {
      await leadsStore.add(lead)
      leadsImported += 1
    }
  }
  for (const activity of activities) {
    if (!(await activitiesStore.get(activity.id))) {
      await activitiesStore.add(activity)
      activitiesImported += 1
    }
  }

  await transaction.done
  return { leadsImported, activitiesImported }
}

export async function replaceAllCrmData(leads, activities = []) {
  const db = await database
  const transaction = db.transaction([LEADS_STORE, ACTIVITIES_STORE], 'readwrite')
  const leadsStore = transaction.objectStore(LEADS_STORE)
  const activitiesStore = transaction.objectStore(ACTIVITIES_STORE)
  await leadsStore.clear()
  await activitiesStore.clear()

  for (const lead of leads) {
    await leadsStore.put(lead)
  }
  for (const activity of activities) {
    await activitiesStore.put(activity)
  }

  await transaction.done
  return { leadsImported: leads.length, activitiesImported: activities.length }
}

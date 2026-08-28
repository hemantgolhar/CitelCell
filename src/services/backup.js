import { getAllActivities, getAllLeads, mergeCrmData, replaceAllCrmData } from './db'

const APP_ID = 'citelcell'
const LEGACY_APP_ID = 'personal-sales-crm'
const BACKUP_VERSION = 2
const requiredLeadFields = ['id', 'businessName', 'contactName', 'phone', 'source', 'status', 'followUp', 'notes', 'createdAt', 'updatedAt']

function downloadFile(contents, filename, type) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}

function isValidLead(lead) {
  return lead && typeof lead === 'object' && !Array.isArray(lead)
    && requiredLeadFields.every((field) => Object.hasOwn(lead, field))
    && typeof lead.id === 'string'
    && typeof lead.businessName === 'string'
    && typeof lead.contactName === 'string'
    && typeof lead.phone === 'string'
    && (typeof lead.product === 'string' || Array.isArray(lead.productsInterested))
    && typeof lead.source === 'string'
    && typeof lead.status === 'string'
    && typeof lead.followUp === 'string'
    && typeof lead.notes === 'string'
    && !Number.isNaN(Date.parse(lead.createdAt))
    && !Number.isNaN(Date.parse(lead.updatedAt))
}

function isValidActivity(activity) {
  return activity && typeof activity === 'object' && !Array.isArray(activity)
    && typeof activity.id === 'string'
    && typeof activity.leadId === 'string'
    && typeof activity.type === 'string'
    && typeof activity.outcome === 'string'
    && typeof activity.note === 'string'
    && !Number.isNaN(Date.parse(activity.createdAt))
}

export async function exportBackup() {
  const [leads, activities] = await Promise.all([getAllLeads(), getAllActivities()])
  const backup = {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    leads,
    activities,
  }
  downloadFile(JSON.stringify(backup, null, 2), `citelcell-backup-${dateStamp()}.json`, 'application/json')
  return leads.length
}

export function validateBackup(contents) {
  let backup
  try {
    backup = JSON.parse(contents)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (backup?.app !== APP_ID && backup?.app !== LEGACY_APP_ID) throw new Error('This is not a CitelCell backup.')
  if (backup.version !== 1 && backup.version !== BACKUP_VERSION) throw new Error('This backup version is not supported.')
  if (!Array.isArray(backup.leads)) throw new Error('This backup does not contain a valid leads list.')
  if (!backup.leads.every(isValidLead)) throw new Error('One or more lead records are invalid or corrupted.')
  if (backup.version === 2 && !Array.isArray(backup.activities)) throw new Error('This backup does not contain a valid activity list.')
  if (backup.version === 2 && !backup.activities.every(isValidActivity)) throw new Error('One or more activity records are invalid or corrupted.')

  return { ...backup, activities: backup.activities || [] }
}

export async function restoreBackup(backup, mode) {
  if (mode === 'merge') return mergeCrmData(backup.leads, backup.activities)
  if (mode === 'replace') return replaceAllCrmData(backup.leads, backup.activities)
  throw new Error('Unknown restore option.')
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function exportLeadsCsv() {
  const leads = await getAllLeads()
  const headings = ['Business Name', 'Business Category', 'Contact Name', 'Designation', 'Mobile Number', 'Secondary Number', 'Email', 'Website', 'Address', 'Products Interested', 'Product Deal Values', 'Total Potential', 'Pipeline Stage', 'Final Sale Value', 'Won At', 'Lost At', 'Lost Reason', 'Lead Source', 'Status', 'Follow-up', 'Notes', 'Created At']
  const rows = leads.map((lead) => [lead.businessName, lead.category, lead.contactName, lead.designation, lead.phone, lead.secondaryPhone, lead.email, lead.website, lead.address, lead.productsInterested.join('; '), lead.productsInterested.map((product) => `${product}: ${lead.productDeals[product] || 0}`).join('; '), Object.values(lead.productDeals).reduce((sum, value) => sum + (Number(value) || 0), 0), lead.pipelineStage, lead.finalSaleValue, lead.wonAt, lead.lostAt, lead.lostReason, lead.source, lead.status, lead.followUp, lead.notes, lead.createdAt])
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  downloadFile(`\uFEFF${csv}`, `citelcell-leads-${dateStamp()}.csv`, 'text/csv;charset=utf-8')
  return leads.length
}

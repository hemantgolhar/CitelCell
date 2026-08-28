import { useRef, useState } from 'react'
import { scanBusinessCard } from '../services/businessCardOcr'
import { formatCurrency, getProductDeals, getProducts, PIPELINE_STAGES, PRODUCT_OPTIONS } from '../utils/pipeline'

const categories = ['Restaurant', 'Cafe', 'Hotel', 'Salon', 'Clinic', 'Hospital', 'Gym', 'Retail Store', 'Optical Store', 'Real Estate', 'Professional Services']
const emptyLead = { businessName: '', category: '', address: '', website: '', contactName: '', designation: '', phone: '', secondaryPhone: '', email: '', productsInterested: [], productDeals: {}, pipelineStage: 'New Lead', source: 'Referral', status: 'New', notes: '', followUp: '' }

function LeadForm({ lead, onSave, onCancel }) {
  const initial = { ...emptyLead, ...lead }
  const initialCategoryIsCustom = initial.category && !categories.includes(initial.category)
  const [form, setForm] = useState(initial)
  const initialProducts = getProducts(initial)
  const [selectedProducts, setSelectedProducts] = useState(initialProducts)
  const [productDeals, setProductDeals] = useState(getProductDeals({ ...initial, productsInterested: initialProducts }))
  const [otherProduct, setOtherProduct] = useState(initialProducts.find((item) => !PRODUCT_OPTIONS.includes(item)) || '')
  const [categoryChoice, setCategoryChoice] = useState(initialCategoryIsCustom ? 'Other' : initial.category)
  const [otherCategory, setOtherCategory] = useState(initialCategoryIsCustom ? initial.category : '')
  const [isSaving, setIsSaving] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [scanError, setScanError] = useState('')
  const [rawOcrText, setRawOcrText] = useState('')
  const [scanned, setScanned] = useState(false)
  const [ocrFields, setOcrFields] = useState(new Set())
  const cardInput = useRef(null)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setOcrFields((current) => {
      const next = new Set(current)
      next.delete(name)
      return next
    })
  }

  const handleCardImage = async (event) => {
    const [file] = event.target.files
    event.target.value = ''
    if (!file) return
    setScanError('')
    setScanned(false)
    setRawOcrText('')
    try {
      const result = await scanBusinessCard(file, setScanStatus)
      const detectedNames = Object.entries(result.fields).filter(([, value]) => value).map(([name]) => name)
      setForm((current) => ({ ...current, ...Object.fromEntries(Object.entries(result.fields).filter(([, value]) => value)) }))
      if (result.fields.category) {
        if (categories.includes(result.fields.category)) {
          setCategoryChoice(result.fields.category)
          setOtherCategory('')
        } else {
          setCategoryChoice('Other')
          setOtherCategory(result.fields.category)
        }
      }
      setOcrFields(new Set(detectedNames))
      setRawOcrText(result.rawText)
      setScanned(true)
    } catch (error) {
      setScanError(error.message || 'The business card could not be scanned. Enter the details manually.')
    } finally {
      setScanStatus('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const productsInterested = [...selectedProducts.filter((item) => PRODUCT_OPTIONS.includes(item)), ...(otherProduct.trim() ? [otherProduct.trim()] : [])]
    const category = categoryChoice === 'Other' ? otherCategory.trim() : categoryChoice
    if (!productsInterested.length) return
    setIsSaving(true)
    await onSave({ ...form, product: productsInterested[0], productsInterested, productDeals: Object.fromEntries(productsInterested.map((product) => [product, Number(productDeals[product]) || 0])), category })
    setIsSaving(false)
  }

  const toggleProduct = (product) => {
    setSelectedProducts((current) => current.includes(product) ? current.filter((item) => item !== product) : [...current, product])
  }
  const chosenProducts = [...selectedProducts.filter((item) => PRODUCT_OPTIONS.includes(item)), ...(otherProduct.trim() ? [otherProduct.trim()] : [])]
  const totalPotential = chosenProducts.reduce((total, product) => total + (Number(productDeals[product]) || 0), 0)

  const fieldClass = (name) => ocrFields.has(name) ? 'ocr-populated' : ''

  return (
    <main className="page lead-form-page">
      <header className="form-header">
        <button className="back-button" type="button" onClick={onCancel} aria-label="Back to leads">‹</button>
        <div><p className="eyebrow">CitelCell</p><h1>{lead ? 'Edit Lead' : 'Add New Lead'}</h1></div>
      </header>

      {!lead && (
        <section className="card-scanner-panel">
          <button type="button" onClick={() => cardInput.current?.click()} disabled={Boolean(scanStatus)}><span aria-hidden="true">📷</span><span><strong>Scan Business Card</strong><small>Take a photo or choose from your gallery</small></span></button>
          <input ref={cardInput} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={handleCardImage} />
          {scanStatus && <div className="scan-progress" role="status"><span className="loading-indicator" aria-hidden="true" /><p>{scanStatus}</p></div>}
          {scanError && <div className="scan-message error" role="alert">{scanError}</div>}
          {scanned && <div className="scan-message success" role="status">Business Card Scanned — Please verify the details.</div>}
          {rawOcrText && <details className="ocr-text"><summary>View Scanned Text</summary><pre>{rawOcrText}</pre></details>}
        </section>
      )}

      <form className="lead-form expanded-lead-form" onSubmit={handleSubmit}>
        <fieldset><legend>Business</legend>
          <label className={fieldClass('businessName')}>Business Name <span>*</span><input name="businessName" value={form.businessName} onChange={updateField} required placeholder="e.g. Sunrise Traders" /></label>
          <label className={fieldClass('category')}>Business Category<select value={categoryChoice} onChange={(event) => { setCategoryChoice(event.target.value); setOcrFields((current) => { const next = new Set(current); next.delete('category'); return next }) }}><option value="">Select category</option>{categories.map((item) => <option key={item}>{item}</option>)}<option>Other</option></select></label>
          {categoryChoice === 'Other' && <label>Other Category<input value={otherCategory} onChange={(event) => setOtherCategory(event.target.value)} placeholder="Enter business category" /></label>}
          <label className={fieldClass('address')}>Address<textarea name="address" value={form.address} onChange={updateField} rows="3" placeholder="Business address" /></label>
          <label className={fieldClass('website')}>Website<input name="website" inputMode="url" value={form.website} onChange={updateField} placeholder="www.example.com" /></label>
        </fieldset>

        <fieldset><legend>Contact Person</legend>
          <label className={fieldClass('contactName')}>Contact Name <span>*</span><input name="contactName" value={form.contactName} onChange={updateField} required placeholder="Full name" /></label>
          <label className={fieldClass('designation')}>Designation<input name="designation" value={form.designation} onChange={updateField} placeholder="Owner, Manager, Director…" /></label>
          <label className={fieldClass('phone')}>Mobile Number <span>*</span><input name="phone" type="tel" inputMode="tel" value={form.phone} onChange={updateField} required placeholder="+91 98765 43210" /></label>
          <label className={fieldClass('secondaryPhone')}>Secondary Number<input name="secondaryPhone" type="tel" inputMode="tel" value={form.secondaryPhone} onChange={updateField} placeholder="Optional second number" /></label>
          <label className={fieldClass('email')}>Email<input name="email" type="email" inputMode="email" value={form.email} onChange={updateField} placeholder="name@business.com" /></label>
        </fieldset>

        <fieldset><legend>Sales</legend>
          <div className="product-picker"><span>Products Interested <b>*</b></span>{PRODUCT_OPTIONS.map((product) => <label key={product} className={selectedProducts.includes(product) ? 'selected' : ''}><input type="checkbox" checked={selectedProducts.includes(product)} onChange={() => toggleProduct(product)} /><span>{product}</span></label>)}<label className={otherProduct ? 'selected' : ''}><span>Other product</span><input value={otherProduct} onChange={(event) => setOtherProduct(event.target.value)} placeholder="Product or service" /></label></div>
          {chosenProducts.length > 0 && <div className="deal-values"><h3>Estimated Deal Value</h3>{chosenProducts.map((product) => <label key={product}><span>{product}</span><div><b>₹</b><input type="number" min="0" inputMode="numeric" value={productDeals[product] ?? ''} onChange={(event) => setProductDeals((current) => ({ ...current, [product]: event.target.value }))} placeholder="0" /></div></label>)}<p><span>Total Potential</span><strong>{formatCurrency(totalPotential)}</strong></p></div>}
          {!chosenProducts.length && <p className="form-validation">Select at least one product.</p>}
          <label>Pipeline Stage<select name="pipelineStage" value={form.pipelineStage} onChange={updateField}>{PIPELINE_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <div className="form-row">
            <label>Lead Source<select name="source" value={form.source} onChange={updateField}><option>Referral</option><option>Walk-in</option><option>Website</option><option>Social Media</option><option>Cold Call</option></select></label>
            <label>Status<select name="status" value={form.status} onChange={updateField}><option>New</option><option>Warm</option><option>Hot</option><option>Won</option><option>Lost</option></select></label>
          </div>
          <label>Next Follow-up<input name="followUp" type="datetime-local" value={form.followUp} onChange={updateField} /></label>
          <label>Notes<textarea name="notes" value={form.notes} onChange={updateField} rows="4" placeholder="Add key requirements or conversation notes" /></label>
        </fieldset>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving || Boolean(scanStatus)}>{isSaving ? 'Saving…' : lead ? 'Save Changes' : 'Save Lead'}</button></div>
      </form>
    </main>
  )
}

export default LeadForm

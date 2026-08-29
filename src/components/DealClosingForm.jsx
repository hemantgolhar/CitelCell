import { useState } from 'react'
import { formatCurrency, getProducts, PRODUCT_OPTIONS } from '../utils/pipeline'

const today = () => new Date().toISOString().slice(0, 10)

function initialForm(lead) {
  if (lead.closingDetails) return lead.closingDetails

  const productsPurchased = lead.soldProducts?.length
    ? lead.soldProducts.map((item) => item.product).filter((product) => PRODUCT_OPTIONS.includes(product))
    : getProducts(lead).filter((product) => PRODUCT_OPTIONS.includes(product))

  return {
    customer: {
      businessName: lead.businessName || '', contactPerson: lead.contactName || '', primaryMobile: lead.phone || '',
      secondaryMobile: lead.secondaryPhone || '', email: lead.email || '', address: lead.address || '',
    },
    sale: { productsPurchased, finalPrice: lead.finalSaleValue || '', discount: '', saleDate: lead.wonAt?.slice(0, 10) || today() },
    payment: { status: '', amountReceived: '', balance: Number(lead.finalSaleValue) || 0, method: '' },
    fulfilment: { status: 'Pending', expectedDate: '', closingNotes: '' },
    productDetails: {},
  }
}

function ProductFields({ product, details, onChange }) {
  const field = (name, value) => onChange({ ...details, [name]: value })

  if (product === 'Aura Smart Business Card') return <div className="product-specific-fields"><h3>Aura Smart Business Card</h3><div className="closing-form-grid"><label>Card Type<select value={details.cardType || ''} onChange={(event) => field('cardType', event.target.value)}><option value="">Select type</option><option>PVC</option><option>Metal</option></select></label><label>Quantity<input type="number" min="0" inputMode="numeric" value={details.quantity || ''} onChange={(event) => field('quantity', Math.max(0, Number(event.target.value) || 0))} /></label></div><label>Name to Print<input value={details.nameToPrint || ''} onChange={(event) => field('nameToPrint', event.target.value)} /></label></div>

  if (product === 'Smart Menu') return <div className="product-specific-fields"><h3>Smart Menu</h3><label>Restaurant/Outlet Name<input value={details.outletName || ''} onChange={(event) => field('outletName', event.target.value)} /></label><label>Number of Outlets<input type="number" min="0" inputMode="numeric" value={details.outletCount || ''} onChange={(event) => field('outletCount', Math.max(0, Number(event.target.value) || 0))} /></label><label>Setup Notes<textarea rows="3" value={details.setupNotes || ''} onChange={(event) => field('setupNotes', event.target.value)} /></label></div>

  if (product === 'Google Review Card') return <div className="product-specific-fields"><h3>Google Review Card</h3><label>Business Name<input value={details.businessName || ''} onChange={(event) => field('businessName', event.target.value)} /></label><label>Google Review Link<input type="url" inputMode="url" value={details.reviewLink || ''} onChange={(event) => field('reviewLink', event.target.value)} /></label><label>Quantity<input type="number" min="0" inputMode="numeric" value={details.quantity || ''} onChange={(event) => field('quantity', Math.max(0, Number(event.target.value) || 0))} /></label></div>

  if (product === 'Citeltech POS') return <div className="product-specific-fields"><h3>Citeltech POS</h3><label>Number of Outlets<input type="number" min="0" inputMode="numeric" value={details.outletCount || ''} onChange={(event) => field('outletCount', Math.max(0, Number(event.target.value) || 0))} /></label><label>Plan/Package<input value={details.plan || ''} onChange={(event) => field('plan', event.target.value)} /></label><label>Setup Notes<textarea rows="3" value={details.setupNotes || ''} onChange={(event) => field('setupNotes', event.target.value)} /></label></div>

  if (product === 'Citelflow.ai') return <div className="product-specific-fields"><h3>Citelflow.ai</h3><label>Plan<input value={details.plan || ''} onChange={(event) => field('plan', event.target.value)} /></label><div className="closing-form-grid"><label>Subscription Start Date<input type="date" value={details.subscriptionStartDate || ''} onChange={(event) => field('subscriptionStartDate', event.target.value)} /></label><label>Subscription End Date<input type="date" value={details.subscriptionEndDate || ''} onChange={(event) => field('subscriptionEndDate', event.target.value)} /></label></div></div>

  return null
}

function DealClosingForm({ lead, onSave, onCancel }) {
  const [form, setForm] = useState(() => initialForm(lead))
  const [saving, setSaving] = useState(false)
  const finalPrice = Math.max(0, Number(form.sale.finalPrice) || 0)
  const enteredReceived = Math.min(finalPrice, Math.max(0, Number(form.payment.amountReceived) || 0))
  const amountReceived = form.payment.status === 'Paid' ? finalPrice : form.payment.status === 'Pending' ? 0 : enteredReceived
  const balance = Math.max(0, finalPrice - amountReceived)
  const valid = form.sale.productsPurchased.length > 0 && finalPrice > 0 && Boolean(form.payment.status)

  const update = (section, name, value) => setForm((current) => ({ ...current, [section]: { ...current[section], [name]: value } }))
  const toggleProduct = (product) => setForm((current) => ({ ...current, sale: { ...current.sale, productsPurchased: current.sale.productsPurchased.includes(product) ? current.sale.productsPurchased.filter((item) => item !== product) : [...current.sale.productsPurchased, product] } }))
  const setProductDetails = (product, value) => setForm((current) => ({ ...current, productDetails: { ...current.productDetails, [product]: value } }))

  const submit = async (event) => {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    const productDetails = Object.fromEntries(form.sale.productsPurchased.map((product) => [product, form.productDetails[product] || {}]))
    const success = await onSave({
      ...form,
      customer: Object.fromEntries(Object.entries(form.customer).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])),
      sale: { ...form.sale, finalPrice, discount: Math.max(0, Number(form.sale.discount) || 0) },
      payment: { ...form.payment, amountReceived, balance },
      fulfilment: { ...form.fulfilment, closingNotes: form.fulfilment.closingNotes.trim() },
      productDetails,
    })
    setSaving(false)
    if (!success) return
  }

  return <main className="page closing-page">
    <header className="form-header"><button className="back-button" type="button" onClick={onCancel} aria-label="Back to lead details">‹</button><div><p className="eyebrow">Customer &amp; sale</p><h1>{lead.closingDetails ? 'Edit Customer Details' : lead.pipelineStage === 'Won' ? 'Add Customer Details' : 'Close Deal'}</h1></div></header>
    <form className="closing-form" onSubmit={submit}>
      <fieldset><legend>Customer</legend><label>Business Name<input value={form.customer.businessName} onChange={(event) => update('customer', 'businessName', event.target.value)} /></label><label>Contact Person<input value={form.customer.contactPerson} onChange={(event) => update('customer', 'contactPerson', event.target.value)} /></label><div className="closing-form-grid"><label>Primary Mobile<input type="tel" inputMode="tel" value={form.customer.primaryMobile} onChange={(event) => update('customer', 'primaryMobile', event.target.value)} /></label><label>Secondary Mobile<input type="tel" inputMode="tel" value={form.customer.secondaryMobile} onChange={(event) => update('customer', 'secondaryMobile', event.target.value)} /></label></div><label>Email<input type="email" inputMode="email" value={form.customer.email} onChange={(event) => update('customer', 'email', event.target.value)} /></label><label>Address<textarea rows="3" value={form.customer.address} onChange={(event) => update('customer', 'address', event.target.value)} /></label></fieldset>

      <fieldset><legend>Sale</legend><div className="closing-products"><span>Products Purchased <b>*</b></span>{PRODUCT_OPTIONS.map((product) => <label className={form.sale.productsPurchased.includes(product) ? 'selected' : ''} key={product}><input type="checkbox" checked={form.sale.productsPurchased.includes(product)} onChange={() => toggleProduct(product)} /><span>{product}</span></label>)}</div><div className="closing-form-grid"><label>Final Selling Price <b>*</b><input type="number" min="0" inputMode="decimal" value={form.sale.finalPrice} onChange={(event) => update('sale', 'finalPrice', event.target.value)} /></label><label>Discount<input type="number" min="0" inputMode="decimal" value={form.sale.discount} onChange={(event) => update('sale', 'discount', event.target.value)} /></label></div><label>Sale Date<input type="date" value={form.sale.saleDate} onChange={(event) => update('sale', 'saleDate', event.target.value)} /></label>{form.sale.productsPurchased.map((product) => <ProductFields key={product} product={product} details={form.productDetails[product] || {}} onChange={(value) => setProductDetails(product, value)} />)}</fieldset>

      <fieldset><legend>Payment</legend><label>Status <b>*</b><select value={form.payment.status} onChange={(event) => update('payment', 'status', event.target.value)}><option value="">Select status</option><option>Paid</option><option>Partial</option><option>Pending</option></select></label><div className="closing-form-grid"><label>Amount Received<input type="number" min="0" max={finalPrice || undefined} inputMode="decimal" disabled={form.payment.status === 'Paid' || form.payment.status === 'Pending'} value={amountReceived || ''} onChange={(event) => update('payment', 'amountReceived', Math.min(finalPrice, Math.max(0, Number(event.target.value) || 0)))} /></label><label>Balance<input readOnly value={formatCurrency(balance)} /></label></div><label>Method<select value={form.payment.method} onChange={(event) => update('payment', 'method', event.target.value)}><option value="">Select method</option><option>UPI</option><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select></label></fieldset>

      <fieldset><legend>Fulfilment</legend><label>Status<select value={form.fulfilment.status} onChange={(event) => update('fulfilment', 'status', event.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label>Expected Delivery/Setup Date<input type="date" value={form.fulfilment.expectedDate} onChange={(event) => update('fulfilment', 'expectedDate', event.target.value)} /></label><label>Closing Notes<textarea rows="4" value={form.fulfilment.closingNotes} onChange={(event) => update('fulfilment', 'closingNotes', event.target.value)} /></label></fieldset>
      {!form.sale.productsPurchased.length && <p className="closing-validation">Select at least one product.</p>}
      <div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving || !valid}>{saving ? 'Saving…' : 'Complete Sale'}</button></div>
    </form>
  </main>
}

export default DealClosingForm

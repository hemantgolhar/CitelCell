import { formatCurrency } from '../utils/pipeline'

const labels = {
  cardType: 'Card Type', quantity: 'Quantity', nameToPrint: 'Name to Print', outletName: 'Restaurant/Outlet Name',
  outletCount: 'Number of Outlets', setupNotes: 'Setup Notes', businessName: 'Business Name', reviewLink: 'Google Review Link',
  plan: 'Plan/Package', subscriptionStartDate: 'Subscription Start', subscriptionEndDate: 'Subscription End',
}

const populated = (value) => value !== '' && value !== null && value !== undefined && value !== 0

function CustomerSaleDetails({ details }) {
  const { sale, payment, fulfilment, productDetails = {} } = details
  const rows = [
    ['Products', sale.productsPurchased?.join(', ')], ['Sale Value', formatCurrency(sale.finalPrice)], ['Sale Date', sale.saleDate],
    ['Discount', Number(sale.discount) > 0 ? formatCurrency(sale.discount) : ''], ['Payment', payment.status],
    ['Amount Received', formatCurrency(payment.amountReceived)], ['Balance', formatCurrency(payment.balance)], ['Payment Method', payment.method],
    ['Fulfilment', fulfilment.status], ['Delivery/Setup Date', fulfilment.expectedDate],
  ].filter(([, value]) => populated(value))

  return <section className="customer-sale-details"><div className="customer-sale-heading"><div><p className="eyebrow">Completed sale</p><h2>Customer &amp; Sale Details</h2></div><span>{payment.status}</span></div><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{sale.productsPurchased?.map((product) => { const entries = Object.entries(productDetails[product] || {}).filter(([, value]) => populated(value)); return entries.length ? <article key={product}><h3>{product}</h3><dl>{entries.map(([key, value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{value}</dd></div>)}</dl></article> : null })}{fulfilment.closingNotes && <div className="closing-notes"><strong>Closing Notes</strong><p>{fulfilment.closingNotes}</p></div>}</section>
}

export default CustomerSaleDetails

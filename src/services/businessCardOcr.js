const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_EDGE = 1800

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Some browsers cannot decode formats such as SVG through createImageBitmap.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function preprocessImage(file) {
  if (!file?.type.startsWith('image/')) throw new Error('Please choose a valid business-card image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('This image is too large. Please choose an image smaller than 20 MB.')

  let image
  try {
    image = await decodeImage(file)
  } catch {
    throw new Error('The selected image could not be opened. Try another photo.')
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0, width, height)
  image.close?.()

  const pixels = context.getImageData(0, 0, width, height)
  const contrast = 1.22
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = 0.299 * pixels.data[index] + 0.587 * pixels.data[index + 1] + 0.114 * pixels.data[index + 2]
    const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128))
    pixels.data[index] = adjusted
    pixels.data[index + 1] = adjusted
    pixels.data[index + 2] = adjusted
  }
  context.putImageData(pixels, 0, 0)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image processing failed.')), 'image/jpeg', 0.9))
}

function uniqueMatches(text, pattern) {
  return [...new Set(text.match(pattern) || [])]
}

const designationWords = /\b(owner|founder|director|manager|proprietor|partner|consultant|executive|officer|ceo|cto|cfo|president|sales|marketing|doctor|dr\.?|architect|designer)\b/i
const companyWords = /\b(pvt|private|limited|ltd|llp|inc|corp|company|solutions|services|enterprises|studio|technologies|tech|restaurant|cafe|hotel|clinic|hospital|salon|gym|store|realty|associates)\b/i
const addressWords = /\b(road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|nagar|colony|sector|floor|building|complex|plaza|city|district|india|maharashtra|mumbai|pune|delhi|bengaluru|bangalore)\b/i

function detectCategory(text) {
  const categories = [
    ['Cafe', /cafe|coffee/i], ['Restaurant', /restaurant|dining|food service/i], ['Hotel', /hotel|hospitality|resort/i],
    ['Salon', /salon|beauty|spa/i], ['Clinic', /clinic|dental|physician/i], ['Hospital', /hospital/i], ['Gym', /gym|fitness/i],
    ['Retail Store', /retail|shop|store/i], ['Optical Store', /optical|optician|eyewear/i], ['Real Estate', /real estate|realty|property/i],
    ['Professional Services', /consulting|consultant|chartered accountant|legal|law firm|architect/i],
  ]
  return categories.find(([, pattern]) => pattern.test(text))?.[0] || ''
}

export function extractBusinessCardFields(rawText) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const emails = uniqueMatches(rawText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)
  const websites = uniqueMatches(rawText, /(?:https?:\/\/|www\.)[^\s,;]+|\b[A-Z0-9-]+\.(?:com|in|org|net|co|ai)\b/gi)
    .filter((value) => !value.includes('@'))
  const phones = uniqueMatches(rawText, /(?:\+?\d[\d\s().-]{7,}\d)/g)
    .map((phone) => phone.trim()).filter((phone) => phone.replace(/\D/g, '').length >= 8)
  const designation = lines.find((line) => designationWords.test(line)) || ''
  const businessName = lines.find((line) => companyWords.test(line) && !designationWords.test(line)) || ''
  const excluded = (line) => emails.includes(line) || websites.some((site) => line.includes(site)) || phones.some((phone) => line.includes(phone)) || designationWords.test(line) || addressWords.test(line)
  const contactName = lines.slice(0, 6).find((line) => !excluded(line) && line !== businessName && /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(line)) || ''
  const addressLines = lines.filter((line) => addressWords.test(line) || /\b\d{6}\b/.test(line)).slice(0, 3)

  return {
    businessName,
    contactName,
    phone: phones[0] || '',
    secondaryPhone: phones[1] || '',
    email: emails[0] || '',
    website: websites[0] || '',
    address: addressLines.join(', '),
    category: detectCategory(rawText),
    designation,
  }
}

export async function scanBusinessCard(file, onStatus = () => {}) {
  let worker
  try {
    onStatus('Reading business card…')
    const image = await preprocessImage(file)
    onStatus('Processing text…')
    const { createWorker } = await import('tesseract.js')
    const assetBase = `${import.meta.env.BASE_URL}tesseract`
    worker = await createWorker('eng', 1, {
      workerPath: `${assetBase}/worker.min.js`,
      langPath: `${assetBase}/lang`,
      corePath: `${assetBase}/core`,
      logger(message) {
        if (message.status === 'recognizing text') onStatus(`Processing text… ${Math.round((message.progress || 0) * 100)}%`)
      },
    })
    const result = await worker.recognize(image)
    const rawText = result.data.text.trim()
    if (!rawText) throw new Error('No readable text was found. Try a clearer, well-lit photo.')
    onStatus('Extracting contact details…')
    return { rawText, fields: extractBusinessCardFields(rawText) }
  } catch (error) {
    if (error instanceof Error && /valid|large|opened|readable/i.test(error.message)) throw error
    throw new Error('The business card could not be scanned. Try another image or enter the details manually.')
  } finally {
    await worker?.terminate()
  }
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall back to normal browser image decoding.
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
  if (!file?.type.startsWith('image/')) {
    throw new Error('Please choose a valid business-card image.')
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('This image is too large. Please choose an image smaller than 20 MB.')
  }

  let image

  try {
    image = await decodeImage(file)
  } catch {
    throw new Error('The selected image could not be opened. Try another photo.')
  }

  /*
   * Keep more resolution than before.
   * Small text such as email addresses and addresses needs pixels.
   */
  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(image.width, image.height)
  )

  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  /*
   * White background prevents transparent/edge areas from
   * becoming dark and confusing OCR.
   */
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  context.drawImage(image, 0, 0, width, height)
  image.close?.()

  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data

  /*
   * Gentle grayscale + contrast enhancement.
   *
   * The previous version applied fairly aggressive processing.
   * Business cards often contain thin fonts, so aggressive
   * thresholding can destroy characters.
   */
  const contrast = 1.12

  for (let i = 0; i < data.length; i += 4) {
    const gray =
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2]

    const adjusted = Math.max(
      0,
      Math.min(255, (gray - 128) * contrast + 128)
    )

    data[i] = adjusted
    data[i + 1] = adjusted
    data[i + 2] = adjusted
  }

  context.putImageData(pixels, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image processing failed.'))
      },
      'image/jpeg',
      0.95
    )
  })
}

function cleanLine(line) {
  return line
    .replace(/[|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '')

  /*
   * Indian numbers:
   * 9373097689
   * +91 93730 97689
   * 91 93730 97689
   */
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return digits
  }

  return value.trim()
}

const designationWords =
  /\b(owner|founder|director|manager|proprietor|partner|consultant|executive|officer|ceo|cto|cfo|president|sales|marketing|doctor|dr\.?|architect|designer|advisor|adviser)\b/i

const companyWords =
  /\b(pvt|private|limited|ltd|llp|inc|corp|company|solutions|service|services|enterprises|studio|technologies|technology|tech|investment|investments|restaurant|cafe|hotel|clinic|hospital|salon|gym|store|realty|associates|industries|traders|agency|group)\b/i

const addressWords =
  /\b(office|road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|nagar|colony|sector|floor|ground floor|building|complex|plaza|center|centre|city|district|opp\.?|opposite|near|nr\.?|india|maharashtra|mumbai|pune|delhi|bengaluru|bangalore)\b/i

function detectCategory(text) {
  const categories = [
    ['Cafe', /\b(cafe|coffee)\b/i],
    ['Restaurant', /\b(restaurant|dining|food service)\b/i],
    ['Hotel', /\b(hotel|hospitality|resort)\b/i],
    ['Salon', /\b(salon|beauty|spa)\b/i],
    ['Clinic', /\b(clinic|dental|physician)\b/i],
    ['Hospital', /\bhospital\b/i],
    ['Gym', /\b(gym|fitness)\b/i],
    ['Retail Store', /\b(retail|shop|store)\b/i],
    ['Optical Store', /\b(optical|optician|eyewear)\b/i],
    ['Real Estate', /\b(real estate|realty|property)\b/i],
    [
      'Professional Services',
      /\b(consulting|consultant|investment|financial|finance|chartered accountant|legal|law firm|architect)\b/i,
    ],
  ]

  return categories.find(([, pattern]) => pattern.test(text))?.[0] || ''
}

export function extractBusinessCardFields(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)

  /*
   * Correct email regex.
   */
  const emails = unique(
    rawText.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || []
  )

  /*
   * Website detection.
   */
  const websites = unique(
    (
      rawText.match(
        /(?:https?:\/\/|www\.)[^\s,;]+|\b[A-Z0-9-]+\.(?:com|in|org|net|co|ai)\b/gi
      ) || []
    ).filter((value) => !value.includes('@'))
  )

  /*
   * Indian/mobile-friendly phone detection.
   */
  const phoneCandidates =
    rawText.match(
      /(?:\+?\s*91[\s.-]*)?(?:[6-9]\d{4}[\s.-]*\d{5}|[6-9]\d{9})/g
    ) || []

  const phones = unique(
    phoneCandidates.map(normalizePhone)
  )

  const designation =
    lines.find((line) => designationWords.test(line)) || ''

  /*
   * Prefer a line containing a legal/company keyword.
   */
  let businessName =
    lines.find(
      (line) =>
        companyWords.test(line) &&
        !designationWords.test(line) &&
        !line.includes('@')
    ) || ''

  /*
   * Avoid selecting long address sentences as company names.
   */
  if (businessName.length > 80) {
    businessName = ''
  }

  const isPhoneLine = (line) => {
    const digits = line.replace(/\D/g, '')
    return digits.length >= 8
  }

  const excludedFromName = (line) =>
    line.includes('@') ||
    websites.some((site) => line.includes(site)) ||
    isPhoneLine(line) ||
    designationWords.test(line) ||
    addressWords.test(line) ||
    line === businessName

  /*
   * Person names are usually near the top of a card.
   */
  const contactName =
    lines
      .slice(0, 8)
      .find(
        (line) =>
          !excludedFromName(line) &&
          line.length >= 3 &&
          line.length <= 45 &&
          /^[A-Za-z][A-Za-z .'-]+$/.test(line) &&
          line.split(/\s+/).length <= 5
      ) || ''

  /*
   * Collect a larger address block instead of only 3 lines.
   */
  const addressStart = lines.findIndex(
    (line) =>
      addressWords.test(line) ||
      /\b\d{6}\b/.test(line)
  )

  let address = ''

  if (addressStart >= 0) {
    const addressLines = []

    for (
      let i = addressStart;
      i < Math.min(lines.length, addressStart + 6);
      i++
    ) {
      const line = lines[i]

      if (
        line.includes('@') ||
        websites.some((site) => line.includes(site))
      ) {
        break
      }

      /*
       * Stop when we reach a standalone phone number.
       */
      if (
        addressLines.length > 0 &&
        isPhoneLine(line) &&
        !addressWords.test(line)
      ) {
        break
      }

      addressLines.push(line)
    }

    address = addressLines.join(', ')
  }

  return {
    businessName,
    contactName,
    phone: phones[0] || '',
    secondaryPhone: phones[1] || '',
    email: emails[0] || '',
    website: websites[0] || '',
    address,
    category: detectCategory(rawText),
    designation,
  }
}

export async function scanBusinessCard(file, onStatus = () => {}) {
  let worker

  try {
    onStatus('Preparing business card…')

    const image = await preprocessImage(file)

    onStatus('Starting offline scanner…')

    const { createWorker } = await import('tesseract.js')

    const assetBase = `${import.meta.env.BASE_URL}tesseract`

    worker = await createWorker('eng', 1, {
      workerPath: `${assetBase}/worker.min.js`,
      langPath: `${assetBase}/lang`,
      corePath: `${assetBase}/core`,

      logger(message) {
        if (message.status === 'recognizing text') {
          onStatus(
            `Reading business card… ${Math.round(
              (message.progress || 0) * 100
            )}%`
          )
        }
      },
    })

    /*
     * AUTO segmentation generally works better for business cards
     * containing several independent text blocks.
     */
    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    const result = await worker.recognize(image)

    const rawText = result.data.text.trim()

    if (!rawText) {
      throw new Error(
        'No readable text was found. Move closer to the card and try again.'
      )
    }

    onStatus('Extracting contact details…')

    return {
      rawText,
      fields: extractBusinessCardFields(rawText),
    }
  } catch (error) {
    console.error('Business card OCR error:', error)

    if (
      error instanceof Error &&
      /valid|large|opened|readable|readable text/i.test(error.message)
    ) {
      throw error
    }

    throw new Error(
      'The business card could not be scanned. Try a closer, well-lit photo.'
    )
  } finally {
    await worker?.terminate()
  }
}
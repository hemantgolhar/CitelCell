const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
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
    throw new Error(
      'Please choose a valid business-card image.'
    )
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      'This image is too large. Please choose an image smaller than 20 MB.'
    )
  }

  let image

  try {
    image = await decodeImage(file)
  } catch {
    throw new Error(
      'The selected image could not be opened. Try another photo.'
    )
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(image.width, image.height)
  )

  const width = Math.max(
    1,
    Math.round(image.width * scale)
  )

  const height = Math.max(
    1,
    Math.round(image.height * scale)
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  )

  image.close?.()

  const pixels = context.getImageData(
    0,
    0,
    width,
    height
  )

  const data = pixels.data
  const contrast = 1.12

  for (let i = 0; i < data.length; i += 4) {
    const gray =
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2]

    const adjusted = Math.max(
      0,
      Math.min(
        255,
        (gray - 128) * contrast + 128
      )
    )

    data[i] = adjusted
    data[i + 1] = adjusted
    data[i + 2] = adjusted
  }

  context.putImageData(pixels, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(
            new Error('Image processing failed.')
          )
        }
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

  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {
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
  /\b(office|shop|flat|road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|nagar|colony|sector|floor|ground floor|building|complex|plaza|center|centre|city|district|opp\.?|opposite|near|nr\.?|india|maharashtra|mumbai|pune|delhi|bengaluru|bangalore)\b/i

function detectCategory(text) {
  const categories = [
    ['Cafe', /\b(cafe|coffee)\b/i],

    [
      'Restaurant',
      /\b(restaurant|dining|food service)\b/i,
    ],

    [
      'Hotel',
      /\b(hotel|hospitality|resort)\b/i,
    ],

    [
      'Salon',
      /\b(salon|beauty|spa)\b/i,
    ],

    [
      'Clinic',
      /\b(clinic|dental|physician)\b/i,
    ],

    ['Hospital', /\bhospital\b/i],

    [
      'Gym',
      /\b(gym|fitness)\b/i,
    ],

    [
      'Retail Store',
      /\b(retail|shop|store)\b/i,
    ],

    [
      'Optical Store',
      /\b(optical|optician|eyewear)\b/i,
    ],

    [
      'Real Estate',
      /\b(real estate|realty|property)\b/i,
    ],

    [
      'Professional Services',
      /\b(consulting|consultant|investment|financial|finance|chartered accountant|legal|law firm|architect)\b/i,
    ],
  ]

  return (
    categories.find(([, pattern]) =>
      pattern.test(text)
    )?.[0] || ''
  )
}

export function extractBusinessCardFields(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)

  // -------------------------
  // EMAIL
  // -------------------------

  const emails = unique(
    rawText.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || []
  )

  // -------------------------
  // WEBSITE
  // -------------------------
  // Remove emails before looking for websites.
  // This prevents gmail.com from becoming website.

  let textWithoutEmails = rawText

  for (const email of emails) {
    textWithoutEmails =
      textWithoutEmails.replace(email, ' ')
  }

  const websites = unique(
    (
      textWithoutEmails.match(
        /(?:https?:\/\/|www\.)[^\s,;]+|\b[A-Z0-9-]+\.(?:com|in|org|net|co|ai)\b/gi
      ) || []
    ).map((site) =>
      site.replace(/[.,]+$/, '')
    )
  )

  // -------------------------
  // PHONE NUMBERS
  // -------------------------

  const phoneCandidates =
    rawText.match(
      /(?:\+?\s*91[\s.-]*)?(?:[6-9]\d{4}[\s.-]*\d{5}|[6-9]\d{9})/g
    ) || []

  const phones = unique(
    phoneCandidates.map(normalizePhone)
  )

  // -------------------------
  // DESIGNATION
  // -------------------------

  const designation =
    lines.find((line) =>
      designationWords.test(line)
    ) || ''

  // -------------------------
  // BUSINESS NAME
  // -------------------------
  //
  // Handles cards such as:
  //
  // RIDHISH
  // INVESTMENT
  // SERVICE
  // LLP

  let businessName = ''

  const legalSuffixIndex =
    lines.findIndex((line) =>
      /\b(llp|ltd|limited|pvt|private|inc|corp|company)\b/i.test(
        line
      )
    )

  if (legalSuffixIndex >= 0) {
    const companyLines = []

    for (
      let i = legalSuffixIndex;
      i >= Math.max(
        0,
        legalSuffixIndex - 4
      );
      i--
    ) {
      const line = lines[i]

      if (!line) {
        break
      }

      if (line.includes('@')) {
        break
      }

      if (addressWords.test(line)) {
        break
      }

      if (designationWords.test(line)) {
        break
      }

      if (
        line.replace(/\D/g, '').length >= 8
      ) {
        break
      }

      if (
        /^[A-Za-z][A-Za-z &.'-]{1,50}$/.test(
          line
        )
      ) {
        companyLines.unshift(line)
      } else {
        break
      }
    }

    businessName =
      companyLines.join(' ').trim()
  }

  // Fallback for businesses without LLP/LTD/etc.

  if (!businessName) {
    const companyIndex =
      lines.findIndex(
        (line) =>
          companyWords.test(line) &&
          !designationWords.test(line) &&
          !addressWords.test(line)
      )

    if (companyIndex >= 0) {
      businessName =
        lines[companyIndex]
    }
  }

  // -------------------------
  // PHONE-LINE HELPER
  // -------------------------

  const isPhoneLine = (line) => {
    return (
      line.replace(/\D/g, '').length >= 8
    )
  }

  // -------------------------
  // CONTACT NAME
  // -------------------------

  const contactName =
    lines
      .slice(0, 6)
      .find((line) => {
        if (line.includes('@')) {
          return false
        }

        if (isPhoneLine(line)) {
          return false
        }

        if (
          designationWords.test(line)
        ) {
          return false
        }

        if (addressWords.test(line)) {
          return false
        }

        if (
          businessName &&
          businessName
            .toLowerCase()
            .includes(
              line.toLowerCase()
            )
        ) {
          return false
        }

        return (
          /^[A-Za-z][A-Za-z .'-]{2,45}$/.test(
            line
          ) &&
          line.split(/\s+/).length <= 5
        )
      }) || ''

  // -------------------------
  // ADDRESS
  // -------------------------

  const addressStart =
    lines.findIndex((line) =>
      /\b(office|shop|flat|floor|building|opp\.?|opposite|road|rd\.?|lane|address)\b/i.test(
        line
      )
    )

  let address = ''

  if (addressStart >= 0) {
    const addressLines = []

    for (
      let i = addressStart;
      i <
      Math.min(
        lines.length,
        addressStart + 7
      );
      i++
    ) {
      let line = lines[i]

      // Email means address has ended.
      if (line.includes('@')) {
        break
      }

      // A phone number after address
      // means address has ended.
      if (
        addressLines.length > 0 &&
        isPhoneLine(line) &&
        !/\b\d{3}[\s-]?\d{3}\b/.test(
          line
        )
      ) {
        break
      }

      // Remove OCR icons such as:
      // @ Office...
      // 📍 Office...
      line = line
        .replace(
          /^[^A-Za-z0-9]+/,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim()

      // Remove occasional OCR junk
      // appearing after large spaces.
      line = line
        .replace(/\s+v\d+$/i, '')
        .trim()

      if (line) {
        addressLines.push(line)
      }

      // Indian PIN code generally
      // indicates final address line.
      if (
        /\b\d{3}[\s-]?\d{3}\b/.test(
          line
        )
      ) {
        break
      }
    }

    address =
      addressLines.join(', ')
  }

  // -------------------------
  // RETURN FIELDS
  // -------------------------

  return {
    businessName,
    contactName,

    phone:
      phones[0] || '',

    secondaryPhone:
      phones[1] || '',

    email:
      emails[0] || '',

    website:
      websites[0] || '',

    address,

    category:
      detectCategory(rawText),

    designation,
  }
}

export async function scanBusinessCard(
  file,
  onStatus = () => {}
) {
  let worker

  try {
    onStatus(
      'Preparing business card…'
    )

    const image =
      await preprocessImage(file)

    onStatus(
      'Starting offline scanner…'
    )

    const { createWorker } =
      await import('tesseract.js')

    const assetBase =
      `${import.meta.env.BASE_URL}tesseract`

    worker = await createWorker(
      'eng',
      1,
      {
        workerPath:
          `${assetBase}/worker.min.js`,

        langPath:
          `${assetBase}/lang`,

        corePath:
          `${assetBase}/core`,

        logger(message) {
          if (
            message.status ===
            'recognizing text'
          ) {
            onStatus(
              `Reading business card… ${Math.round(
                (message.progress || 0) *
                  100
              )}%`
            )
          }
        },
      }
    )

    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    // Automatically correct card orientation.
    const result =
      await worker.recognize(
        image,
        {
          rotateAuto: true,
        }
      )

    const rawText =
      result.data.text.trim()

    if (!rawText) {
      throw new Error(
        'No readable text was found. Move closer to the card and try again.'
      )
    }

    onStatus(
      'Extracting contact details…'
    )

    return {
      rawText,
      fields:
        extractBusinessCardFields(
          rawText
        ),
    }
  } catch (error) {
    console.error(
      'Business card OCR error:',
      error
    )

    if (
      error instanceof Error &&
      /valid|large|opened|readable|readable text/i.test(
        error.message
      )
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
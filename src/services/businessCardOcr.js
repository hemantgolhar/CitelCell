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

  context.drawImage(image, 0, 0, width, height)
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
  let digits = value.replace(/\D/g, '')

  // 09860438424 -> 9860438424
  if (
    digits.length === 11 &&
    digits.startsWith('0')
  ) {
    digits = digits.slice(1)
  }

  // +91 93730 97689 -> 9373097689
  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {
    digits = digits.slice(2)
  }

  if (digits.length === 10) {
    return digits
  }

  return ''
}

const designationWords =
  /\b(owner|founder|director|manager|proprietor|partner|consultant|executive|officer|ceo|cto|cfo|president|sales|marketing|architect|designer|advisor|adviser|pediatrician|paediatrician|intensivist|surgeon|physician|dentist|consulting doctor)\b/i

const qualificationWords =
  /\b(mbbs|md|ms|dch|dnb|dm|mch|bds|mds|fellow|picu|nicu|frcs|fcps)\b/i

const companyWords =
  /\b(pvt|private|limited|ltd|llp|inc|corp|company|solutions|service|services|enterprises|studio|technologies|technology|tech|investment|investments|restaurant|cafe|hotel|clinic|hospital|salon|gym|store|realty|associates|industries|traders|agency|group|healthcare|medical|centre|center)\b/i

const addressWords =
  /\b(office|shop|flat|road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|nagar|colony|sector|floor|building|complex|plaza|center|centre|city|district|opp\.?|opposite|near|nr\.?|behind|infront|in front|india|maharashtra|mumbai|pune|delhi|bengaluru|bangalore|baner)\b/i

function detectCategory(text) {
  const categories = [
    [
      'Clinic',
      /\b(clinic|doctor|dr\.?|pediatrician|paediatrician|physician|surgeon|dentist|medical|mbbs|dch|picu|nicu|intensivist)\b/i,
    ],

    [
      'Hospital',
      /\bhospital\b/i,
    ],

    [
      'Cafe',
      /\b(cafe|coffee)\b/i,
    ],

    [
      'Restaurant',
      /\b(restaurant|dining|food service|veg cuisine|cuisine|pure veg|vegetarian)\b/i,
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
  // Remove email addresses before website detection.
  // Prevents gmail.com from becoming the website.

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
      /(?:\+?\s*91[\s.-]*)?0?[6-9](?:[\s.-]*\d){9}/g
    ) || []

  const phones = unique(
    phoneCandidates
      .map(normalizePhone)
      .filter(Boolean)
  )

  const isPhoneLine = (line) => {
    const digits =
      line.replace(/\D/g, '')

    return (
      digits.length === 10 ||
      digits.length === 11 ||
      digits.length === 12
    )
  }

  // -------------------------
  // CONTACT NAME
  // -------------------------

  const contactName =
    lines
      .slice(0, 8)
      .find((line) => {
        if (line.includes('@')) {
          return false
        }

        if (isPhoneLine(line)) {
          return false
        }

        if (addressWords.test(line)) {
          return false
        }

        if (qualificationWords.test(line)) {
          return false
        }

        if (designationWords.test(line)) {
          return false
        }

        if (
          /^dr\.?\s+[A-Za-z][A-Za-z .'-]{2,45}$/i.test(
            line
          )
        ) {
          return true
        }

        return (
          /^[A-Za-z][A-Za-z .'-]{2,45}$/.test(
            line
          ) &&
          line.split(/\s+/).length >= 2 &&
          line.split(/\s+/).length <= 5
        )
      }) || ''

  // -------------------------
  // DESIGNATION
  // -------------------------

  const designation =
    lines.find(
      (line) =>
        designationWords.test(line) &&
        line !== contactName
    ) || ''

  // -------------------------
  // BUSINESS NAME
  // -------------------------

  let businessName = ''

  // Strongest case:
  // RIDHISH
  // INVESTMENT
  // SERVICE
  // LLP

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

      if (isPhoneLine(line)) {
        break
      }

      if (
        line === contactName ||
        qualificationWords.test(line) ||
        designationWords.test(line)
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

  // Look for an explicit company/business line.
  if (!businessName) {
    const companyIndex =
      lines.findIndex(
        (line) =>
          companyWords.test(line) &&
          !designationWords.test(line) &&
          !qualificationWords.test(line) &&
          !addressWords.test(line) &&
          line !== contactName
      )

    if (companyIndex >= 0) {
      businessName =
        lines[companyIndex]
    }
  }

  /*
   * IMPORTANT:
   *
   * Do NOT use the person's name as the business name.
   *
   * If OCR cannot confidently determine the company,
   * leave Business Name blank for manual verification.
   */

  // -------------------------
  // ADDRESS
  // -------------------------

  const addressStart =
    lines.findIndex((line) =>
      addressWords.test(line)
    )

  let address = ''

  if (addressStart >= 0) {
    const addressLines = []

    for (
      let i = addressStart;
      i <
      Math.min(
        lines.length,
        addressStart + 8
      );
      i++
    ) {
      let line = lines[i]

      if (line.includes('@')) {
        break
      }

      // Stop if another phone/contact line begins.
      if (
        addressLines.length > 0 &&
        isPhoneLine(line) &&
        !/\b\d{3}[\s-]?\d{3}\b/.test(
          line
        )
      ) {
        break
      }

      line = line
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/\s+/g, ' ')
        .trim()

      line = line
        .replace(/\s+v\d+$/i, '')
        .trim()

      if (line) {
        addressLines.push(line)
      }

      // Stop after Indian PIN code.
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

function scoreOcrText(text) {
  if (!text) {
    return 0
  }

  let score = 0

  const words =
    text.match(/[A-Za-z]{2,}/g) || []

  score += Math.min(
    words.length,
    40
  )

  if (
    /[6-9](?:[\s.-]*\d){9}/.test(
      text
    )
  ) {
    score += 12
  }

  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
      text
    )
  ) {
    score += 12
  }

  if (
    /\b(road|rd|street|lane|floor|office|building|plaza|pune|mumbai|nagar|city)\b/i.test(
      text
    )
  ) {
    score += 8
  }

  if (
    /\b(llp|ltd|pvt|company|services|restaurant|cafe|hotel|clinic|hospital|cuisine|investment)\b/i.test(
      text
    )
  ) {
    score += 8
  }

  return score
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

    // -------------------------
    // OCR PASS 1
    // -------------------------

    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    const firstResult =
      await worker.recognize(
        image,
        {
          rotateAuto: true,
        }
      )

    let rawText =
      firstResult.data.text.trim()

    const firstScore =
      scoreOcrText(rawText)

    // -------------------------
    // OCR PASS 2
    // -------------------------
    // Only retry when first result is weak.

    if (
      firstScore < 35 ||
      rawText.length < 80
    ) {
      onStatus(
        'Improving scan accuracy…'
      )

      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      })

      const secondResult =
        await worker.recognize(
          image,
          {
            rotateAuto: true,
          }
        )

      const secondText =
        secondResult.data.text.trim()

      const secondScore =
        scoreOcrText(secondText)

      if (
        secondScore > firstScore
      ) {
        rawText = secondText
      }
    }

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